echo 'Re-deploying'
docker service create --name="mconnect-bus-nodejs" \
  --env SERVICE_PORT=5000 \
  --env KAFKA_HOST=10.0.10.107:9092,10.0.10.108:9092,10.0.10.109:9092 \
  --env IN_TOPIC=mconnect-bus-in \
  --env IN_GROUP_ID=mconnect-bus-consumer-group \
  --env OUT_TOPIC=mconnect-bus-out \
  --env DB_HOST=10.0.10.112 \
  --env DB_PORT=5432 \
  --env DB_NAME=mconnect_bus_db \
  --env DB_USER=postgres \
  --env DB_PASSWORD=postgres \
  --env DB_TABLE_REQUESTS=public.requests \
  --env DB_TABLE_RESPONSES=public.responses \
  --env DB_TABLE_TREASURY_REQUESTS=public.treasury_requests \
  --env DB_TABLE_TREASURY_RESPONSES=public.treasury_responses \
  --env PP_BASE_URL=http://10.0.10.116:9111 \
  --env TREASURY_BASE_URL=http://10.47.14.5 \
  --env LOG_FILE_SIZE_MB=5 \
  --env LOG_FILES_SAVE_DAYS=30 \
  --publish published=5000,target=5000 \
  --network ocds-network \
  --dns 10.0.10.115 \
  --with-registry-auth \
  docker-registry.eprocurement.systems/mconnect-bus:1.1.1.X