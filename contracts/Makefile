# Simple local development makefile.

dev-node:
	chmod +x ./dev-node
	./dev-node

build-image:
	docker build -t bundler-typescript:v-local .

start-influxdb:
	docker-compose up influxdb

start-grafana:
	docker-compose up grafana