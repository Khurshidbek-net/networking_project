import { Injectable } from "@nestjs/common"

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: "ok",
      message: "WMS Backend is running",
      timestamp: new Date().toISOString(),
    }
  }

  getDetailedHealth(): object {
    return {
      status: "ok",
      service: "WMS Backend",
      version: "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    }
  }
}
