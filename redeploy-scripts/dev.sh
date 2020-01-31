echo 'Re-deploying'
docker run --name="mconnect-bus-nodejs" \
  --env SERVICE_ID=83 \
  --env SERVICE_NAME=mconnect-bus-nodejs \
  --env SERVICE_VERSION=1.1.1.65 \
  --env SERVICE_PORT=5000 \
  --env KAFKA_HOST=10.0.20.107:9092,10.0.20.108:9092,10.0.20.109:9092 \
  --env IN_TOPIC=mconnect-bus-in \
  --env IN_GROUP_ID=mconnect-bus-consumer-group \
  --env OUT_TOPIC=mconnect-bus-out \
  --env INCIDENTS_TOPIC=incidents \
  --env DB_HOST=10.0.20.112 \
  --env DB_PORT=5432 \
  --env DB_NAME=mconnect_bus_db \
  --env DB_USER=postgres \
  --env DB_PASSWORD=postgres \
  --env DB_TABLE_REQUESTS=public.requests \
  --env DB_TABLE_RESPONSES=public.responses \
  --env DB_TABLE_TREASURY_REQUESTS=public.treasury_requests \
  --env DB_TABLE_TREASURY_RESPONSES=public.treasury_responses \
  --env DB_TABLE_ERRORS=public.errors \
  --env PP_BASE_URL=http://10.0.20.126:9111 \
  --env TREASURY_BASE_URL=https://illyapetrusenko1.pythonanywhere.com \
  --env LOG_FILE_SIZE_MB=5 \
  --env LOG_FILES_SAVE_DAYS=30 \
  -p 5000:5000 \
  --network ocds-network \
  --dns 10.0.20.115 \
  --privileged \
  dev.docker-registry.eprocurement.systems/mconnect-bus:1.1.1.65
