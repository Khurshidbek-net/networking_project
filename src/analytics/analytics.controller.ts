import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics data' })
  async getDashboardAnalytics() {
    return this.analyticsService.getDashboardAnalytics();
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory analytics' })
  @ApiResponse({ status: 200, description: 'Inventory analytics data' })
  async getInventoryAnalytics() {
    return this.analyticsService.getInventoryAnalytics();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order analytics' })
  @ApiResponse({ status: 200, description: 'Order analytics data' })
  async getOrderAnalytics(period?: string) {
    return this.analyticsService.getOrderAnalytics(period);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics data' })
  async getPerformanceMetrics() {
    return this.analyticsService.getPerformanceMetrics();
  }
}
