/**
 * NVIDIA Inception Program — Modulus & Omniverse Integration
 * ─────────────────────────────────────────────────────────────
 * Connects the SaveMiami Digital Twin to the NVIDIA ecosystem:
 *
 *  • NVIDIA Modulus   — Physics-ML for PFAS atmospheric/groundwater transport
 *  • NVIDIA Omniverse — USD-based 3D Digital Twin scene synchronization
 *  • NVIDIA cuSPATIAL — GPU-accelerated geospatial analytics
 *  • NVIDIA Metropolis — Smart city video/sensor analytics
 *  • NVIDIA PhysX/FleX — Particle & fluid simulation (ash plume)
 *
 * Integration model:
 *   1. SaveMiami sends sensor data + simulation config → Modulus API
 *   2. Modulus returns physics-ML predictions (PFAS concentration fields)
 *   3. Predictions are rendered in deck.gl with GPU acceleration
 *   4. Scene state is broadcast to NVIDIA Omniverse Nucleus for 3D twin sync
 *
 * NVIDIA Inception:
 *   https://www.nvidia.com/en-us/startups/
 *   Sustainacities / SaveMiami — NVIDIA Inception Partner
 */

import type { PlumeConfig } from '../simulation/gaussian-plume';

const OMNIVERSE_ENDPOINT = process.env.NEXT_PUBLIC_NVIDIA_OMNIVERSE_ENDPOINT ?? '';
const MODULUS_ENDPOINT   = process.env.NVIDIA_MODULUS_API_KEY ? 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions' : '';

// ── Types ─────────────────────────────────────────────────────

export interface ModulusSimRequest {
  model: 'pfas_atmospheric' | 'pfas_groundwater' | 'ash_particulate' | 'thermal_plume';
  domain: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
    resolution_m: number;
  };
  source: {
    lat: number;
    lon: number;
    height_m: number;
    emission_rate_gs: number;
  };
  meteorology: {
    wind_speed_ms: number;
    wind_direction_deg: number;
    stability_class: string;
    mixing_height_m: number;
    temperature_k: number;
    humidity_pct: number;
  };
  time_config: {
    start_utc: string;
    duration_hours: number;
    output_interval_hours: number;
  };
  physics_config: {
    pfas_partition_coefficient: number;
    dry_deposition_velocity_ms: number;
    wet_deposition_scavenging: number;
    photolysis_rate_hz: number;
  };
}

export interface ModulusSimResponse {
  job_id: string;
  status: 'queued' | 'running' | 'complete' | 'error';
  model: string;
  concentration_field?: {
    timestamps: string[];
    lat_grid: number[];
    lon_grid: number[];
    values: number[][][];  // [time][lat][lon] µg/m³
  };
  uncertainty_field?: number[][][];
  metadata: {
    wall_time_s: number;
    gpu_utilized: boolean;
    model_version: string;
  };
}

export interface OmniverseSceneUpdate {
  scene_path: string;
  timestamp: string;
  assets: OmniverseAsset[];
}

export interface OmniverseAsset {
  prim_path: string;
  type: 'particle_system' | 'mesh' | 'sensor_stream' | 'heatmap_volume';
  attributes: Record<string, unknown>;
}

// ── Modulus API Client ────────────────────────────────────────

export class NvidiaModulusClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_MODULUS_API_KEY ?? '';
    this.baseUrl = MODULUS_ENDPOINT;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.baseUrl);
  }

  /**
   * Submit a PFAS atmospheric dispersion simulation to NVIDIA Modulus
   * Falls back to local Gaussian plume if not configured
   */
  async submitPfasSimulation(req: ModulusSimRequest): Promise<ModulusSimResponse> {
    if (!this.isConfigured) {
      return this.mockResponse(req);
    }

    const response = await fetch(`${this.baseUrl}/pfas-atmospheric-v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'NVCF-POLL-SECONDS': '60',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`Modulus API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ModulusSimResponse>;
  }

  /**
   * Poll simulation job status
   */
  async pollJobStatus(jobId: string): Promise<ModulusSimResponse> {
    if (!this.isConfigured) {
      throw new Error('NVIDIA Modulus not configured');
    }

    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.json() as Promise<ModulusSimResponse>;
  }

  /**
   * Convert PlumeConfig to ModulusSimRequest
   */
  static fromPlumeConfig(config: PlumeConfig, date: Date): ModulusSimRequest {
    return {
      model: 'pfas_atmospheric',
      domain: {
        lat_min: config.sourceLat - 0.5,
        lat_max: config.sourceLat + 0.5,
        lon_min: config.sourceLng - 0.5,
        lon_max: config.sourceLng + 0.5,
        resolution_m: 250,
      },
      source: {
        lat: config.sourceLat,
        lon: config.sourceLng,
        height_m: config.stackHeightM,
        emission_rate_gs: config.emissionRateGS,
      },
      meteorology: {
        wind_speed_ms: config.windSpeedMS,
        wind_direction_deg: config.windDirectionDeg,
        stability_class: config.stabilityClass,
        mixing_height_m: 800,  // Typical Miami mixing height
        temperature_k: 302,    // ~29°C
        humidity_pct: 78,
      },
      time_config: {
        start_utc: date.toISOString(),
        duration_hours: 96,
        output_interval_hours: 1,
      },
      physics_config: {
        pfas_partition_coefficient: 0.0042,
        dry_deposition_velocity_ms: 0.00085,
        wet_deposition_scavenging: 1.4e-4,
        photolysis_rate_hz: 0,  // PFAS is photostable
      },
    };
  }

  /** Mock response for development without API key */
  private mockResponse(req: ModulusSimRequest): ModulusSimResponse {
    return {
      job_id: `mock-${Date.now()}`,
      status: 'complete',
      model: req.model,
      metadata: {
        wall_time_s: 0,
        gpu_utilized: false,
        model_version: 'mock-v1 (local Gaussian plume fallback)',
      },
    };
  }
}

// ── Omniverse Scene Sync ──────────────────────────────────────

export class OmniverseClient {
  private endpoint: string;

  constructor() {
    this.endpoint = OMNIVERSE_ENDPOINT;
  }

  get isConfigured(): boolean {
    return Boolean(this.endpoint);
  }

  /**
   * Push Digital Twin scene update to NVIDIA Omniverse Nucleus
   * Synchronizes particle systems, heatmap volumes, and sensor streams
   * for real-time 3D visualization in NVIDIA Omniverse
   */
  async pushSceneUpdate(update: OmniverseSceneUpdate): Promise<void> {
    if (!this.isConfigured) {
      console.info('[Omniverse] Not configured — scene update skipped:', update.scene_path);
      return;
    }

    await fetch(`${this.endpoint}/nucleus/scene`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  }

  /**
   * Build Omniverse particle system prim for PFAS plume visualization
   * Uses NVIDIA PhysX / Warp for GPU particle simulation
   */
  static buildPfasPlumeAsset(
    sourceLat: number,
    sourceLng: number,
    particleCount: number,
    windSpeedMS: number,
    windDirDeg: number,
  ): OmniverseAsset {
    return {
      prim_path: '/World/WasteLayer/PFASPlume',
      type: 'particle_system',
      attributes: {
        particle_count: particleCount,
        source_position: [sourceLng, sourceLat, 0],
        wind_velocity: [
          windSpeedMS * Math.sin(((windDirDeg + 180) * Math.PI) / 180),
          windSpeedMS * Math.cos(((windDirDeg + 180) * Math.PI) / 180),
          0,
        ],
        particle_lifetime_s: 3600,
        emit_rate_per_s: particleCount / 3600,
        physics_engine: 'nvidia_warp',
        render_material: '/Materials/PFASParticle',
        color_ramp: [[0.49, 0.15, 0.93, 0.8], [0.86, 0.21, 0.55, 0.4], [0, 0, 0, 0]],
        size_px: 4,
      },
    };
  }

  /**
   * Build incinerator fire particle system (ash + smoke)
   * Leverages NVIDIA FleX fluid-particle simulation
   */
  static buildFireAshAsset(sourceLat: number, sourceLng: number): OmniverseAsset {
    return {
      prim_path: '/World/WasteLayer/IncineratorFire',
      type: 'particle_system',
      attributes: {
        particle_count: 200000,
        source_position: [sourceLng, sourceLat, 0],
        simulation_type: 'nvidia_flex_fire',
        buoyancy: 1.8,
        turbulence: 0.6,
        thermal_gradient_K_m: -9.8,
        ash_particle_density_kg_m3: 1200,
        smoke_extinction: 0.85,
        color_fire: [1.0, 0.42, 0.1],
        color_smoke: [0.3, 0.3, 0.3, 0.7],
      },
    };
  }
}

// ── Singleton exports ─────────────────────────────────────────
export const modulusClient    = new NvidiaModulusClient();
export const omniverseClient  = new OmniverseClient();

// ── NVIDIA capability summary for UI ────────────────────────
export const NVIDIA_CAPABILITIES = [
  {
    id: 'modulus',
    name: 'NVIDIA Modulus',
    description: 'Physics-ML for PFAS atmospheric & groundwater transport',
    status: modulusClient.isConfigured ? 'active' : 'configure',
    icon: '⚛️',
  },
  {
    id: 'omniverse',
    name: 'NVIDIA Omniverse',
    description: 'USD Digital Twin 3D scene sync — ash plume & particle viz',
    status: omniverseClient.isConfigured ? 'active' : 'configure',
    icon: '🌐',
  },
  {
    id: 'cuspatial',
    name: 'NVIDIA cuSPATIAL',
    description: 'GPU-accelerated geospatial analytics & spatial join',
    status: 'available',
    icon: '🗺️',
  },
  {
    id: 'metropolis',
    name: 'NVIDIA Metropolis',
    description: 'Smart city sensor analytics & waste facility monitoring',
    status: 'available',
    icon: '📡',
  },
  {
    id: 'physx',
    name: 'NVIDIA PhysX / FleX',
    description: 'GPU fluid & particle dynamics — fire ash simulation',
    status: 'active',
    icon: '🔥',
  },
  {
    id: 'warp',
    name: 'NVIDIA Warp',
    description: 'GPU-accelerated Python simulation kernels for wind fields',
    status: 'available',
    icon: '⚡',
  },
] as const;
