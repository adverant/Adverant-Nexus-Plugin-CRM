import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * GeoAgent Client
 *
 * Provides interface to the Nexus GeoAgent service for geospatial operations
 * using H3 hexagonal grid system.
 *
 * Use this for:
 * - Proximity searches (find contacts/companies near a location)
 * - Territory management (assign sales territories)
 * - Route optimization (plan visit sequences)
 * - Location-based segmentation (target specific regions)
 * - Geofencing (trigger actions when entering/leaving areas)
 */
export class GeoClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.geoAgent;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000, // 15 seconds for geo operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('GeoAgent request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('GeoAgent request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('GeoAgent response', {
          status: response.status,
          resultsCount: response.data?.results?.length,
        });
        return response;
      },
      (error) => {
        logger.error('GeoAgent response error', {
          error: error.message,
          response: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Find contacts/companies within radius of a location
   *
   * Example:
   * ```typescript
   * const nearby = await geoClient.proximitySearch({
   *   lat: 7.8804,
   *   lng: 98.3923,
   *   radiusKm: 5,
   *   entityType: 'contact',
   *   filters: { leadStatus: 'qualified' }
   * });
   * ```
   */
  async proximitySearch(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    entityType: 'contact' | 'company';
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      name: string;
      distance: number;
      coordinates: { lat: number; lng: number };
      h3Index: string;
    }>
  > {
    try {
      logger.info('GeoAgent proximity search', {
        lat: params.lat,
        lng: params.lng,
        radiusKm: params.radiusKm,
        entityType: params.entityType,
      });

      const response = await this.client.post('/api/proximity', {
        location: { lat: params.lat, lng: params.lng },
        radiusKm: params.radiusKm,
        entityType: params.entityType,
        filters: params.filters || {},
        limit: params.limit || 100,
      });

      return response.data.results;
    } catch (error: any) {
      logger.error('Failed to execute proximity search', {
        error: error.message,
        lat: params.lat,
        lng: params.lng,
      });
      throw new Error(`GeoAgent proximity search failed: ${error.message}`);
    }
  }

  /**
   * Geocode address to coordinates
   *
   * Converts address string to lat/lng coordinates
   */
  async geocode(address: string): Promise<{
    lat: number;
    lng: number;
    formattedAddress: string;
    h3Index: string;
    confidence: number;
  }> {
    try {
      const response = await this.client.post('/api/geocode', { address });

      return {
        lat: response.data.lat,
        lng: response.data.lng,
        formattedAddress: response.data.formattedAddress,
        h3Index: response.data.h3Index,
        confidence: response.data.confidence,
      };
    } catch (error: any) {
      logger.error('Failed to geocode address', {
        error: error.message,
        address,
      });
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<{
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    h3Index: string;
  }> {
    try {
      const response = await this.client.post('/api/reverse-geocode', { lat, lng });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to reverse geocode', {
        error: error.message,
        lat,
        lng,
      });
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Define sales territory using polygon or radius
   *
   * Example:
   * ```typescript
   * const territory = await geoClient.defineTerritory({
   *   name: 'Rawai District',
   *   type: 'radius',
   *   center: { lat: 7.8804, lng: 98.3923 },
   *   radiusKm: 10,
   *   assignedTo: 'sales_rep_123'
   * });
   * ```
   */
  async defineTerritory(params: {
    name: string;
    type: 'polygon' | 'radius';
    polygon?: Array<{ lat: number; lng: number }>;
    center?: { lat: number; lng: number };
    radiusKm?: number;
    assignedTo?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    territoryId: string;
    h3Cells: string[];
    areaKm2: number;
  }> {
    try {
      const response = await this.client.post('/api/territory', params);

      return {
        territoryId: response.data.territoryId,
        h3Cells: response.data.h3Cells,
        areaKm2: response.data.areaKm2,
      };
    } catch (error: any) {
      logger.error('Failed to define territory', {
        error: error.message,
        name: params.name,
      });
      throw new Error(`Failed to define territory: ${error.message}`);
    }
  }

  /**
   * Find which territory contains a location
   */
  async findTerritoryForLocation(
    lat: number,
    lng: number
  ): Promise<{
    territoryId: string;
    territoryName: string;
    assignedTo?: string;
  } | null> {
    try {
      const response = await this.client.post('/api/territory/find', { lat, lng });

      if (!response.data.territory) {
        return null;
      }

      return response.data.territory;
    } catch (error: any) {
      logger.error('Failed to find territory', {
        error: error.message,
        lat,
        lng,
      });
      throw new Error(`Failed to find territory: ${error.message}`);
    }
  }

  /**
   * Optimize route for visiting multiple locations
   *
   * Uses traveling salesman algorithm to find optimal visit sequence
   */
  async optimizeRoute(params: {
    startLocation: { lat: number; lng: number };
    locations: Array<{ id: string; lat: number; lng: number }>;
    endLocation?: { lat: number; lng: number };
    optimizationGoal?: 'distance' | 'time';
  }): Promise<{
    optimizedSequence: string[];
    totalDistance: number;
    estimatedDuration: number;
    waypoints: Array<{ id: string; lat: number; lng: number; order: number }>;
  }> {
    try {
      logger.info('Optimizing route', {
        locationCount: params.locations.length,
        goal: params.optimizationGoal || 'distance',
      });

      const response = await this.client.post('/api/route/optimize', params);

      return response.data;
    } catch (error: any) {
      logger.error('Failed to optimize route', {
        error: error.message,
        locationCount: params.locations.length,
      });
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  }

  /**
   * Create geofence (trigger actions when entering/leaving area)
   *
   * Example:
   * ```typescript
   * const geofence = await geoClient.createGeofence({
   *   name: 'Rawai Beach Area',
   *   center: { lat: 7.7728, lng: 98.3267 },
   *   radiusMeters: 500,
   *   triggers: {
   *     onEnter: 'send_welcome_notification',
   *     onExit: 'log_visit_duration'
   *   }
   * });
   * ```
   */
  async createGeofence(params: {
    name: string;
    center: { lat: number; lng: number };
    radiusMeters: number;
    triggers?: {
      onEnter?: string;
      onExit?: string;
      onDwell?: string;
    };
    metadata?: Record<string, any>;
  }): Promise<{
    geofenceId: string;
    h3Index: string;
  }> {
    try {
      const response = await this.client.post('/api/geofence', params);

      return {
        geofenceId: response.data.geofenceId,
        h3Index: response.data.h3Index,
      };
    } catch (error: any) {
      logger.error('Failed to create geofence', {
        error: error.message,
        name: params.name,
      });
      throw new Error(`Failed to create geofence: ${error.message}`);
    }
  }

  /**
   * Get contacts/companies in a specific territory
   */
  async getEntitiesInTerritory(
    territoryId: string,
    entityType: 'contact' | 'company',
    filters?: Record<string, any>
  ): Promise<Array<{ id: string; name: string; coordinates: { lat: number; lng: number } }>> {
    try {
      const response = await this.client.get(`/api/territory/${territoryId}/entities`, {
        params: {
          entityType,
          ...filters,
        },
      });

      return response.data.results;
    } catch (error: any) {
      logger.error('Failed to get entities in territory', {
        error: error.message,
        territoryId,
        entityType,
      });
      throw new Error(`Failed to get entities in territory: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const geoClient = new GeoClient();

export default geoClient;
