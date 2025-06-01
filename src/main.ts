import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Enable CORS
  app.enableCors({
    origin: "*",
    credentials: true,
  })

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("WMS API")
    .setDescription("Warehouse Management System API Documentation")
    .setVersion("1.0")
    .addTag("inventory", "Inventory management endpoints")
    .addTag("orders", "Order management endpoints")
    .addTag("inbound", "Inbound shipment endpoints")
    .addTag("outbound", "Outbound shipment endpoints")
    .addTag("analytics", "Analytics and reporting endpoints")
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api/docs", app, document)

  const port = process.env.PORT || 3000
  await app.listen(port)

  console.log(`🚀 WMS Backend is running on: http://localhost:${port}`)
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`)
}

bootstrap()
