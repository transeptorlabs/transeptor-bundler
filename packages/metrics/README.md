# Monitoring Geth with InfluxDB and Grafana

Metrics gives inight into the bundler node to allow for preformance tuning and debugging. Transeptor bundler can be be configure to store metrics using a push(InfluxDB) and pull(Prometheus) metrics system. Grafana is used to visualize the metrics.

## Setting up InfluxDB Docker

By default, InfluxDB is reachable at localhost:8086. We can use docker to run InfluxDB in a container.

### Persist data outside the InfluxDB container
Create a new directory to store your metrics data.

```bash
mkdir $PWD/influxdb-data
```

### Run InfluxDB(in docker container)

```bash
docker run \
    --name influxdb \
    -p 8086:8086 \
    --volume $PWD/influxdb-data:/var/lib/influxdb2 \
    influxdb:2.7.1 --reporting-disabled
```

or use docker-compose

```bash
npm run influxdb
```

### Set up InfluxDB to store metrics
Once InfluxDB is running, we can create a database for our metrics by opening a shell in the InfluxDB container. By default InfluxDB can be reached at http:localhost:8086. We will use the CLI to set up InfluxDB an initial admin user, operator token, and bucket.

To use the influx command line interface, open a shell in the influxdb Docker container:
```bash
docker exec -it influxdb /bin/bash
```

The following example command is use to set up InfluxDB in non-interactive mode with an initial admin user, operator token, and bucket. For local develploment we use defaults user credentials below:

- username 'transeptor-admin'
- password 'adminpwd'
- token 'DEV_TOKEN'
- org 'transeptor-labs'
- bucket '_transeptor_metrics'

```bash
influx setup \
  --username 'transeptor-admin' \
  --password 'adminpwd' \
  --token 'DEV_TOKEN' \
  --org 'transeptor-labs' \
  --bucket 'transeptor_metrics' \
  --force
```

Now that we are all set up with the initial admin user let created a user for Transeptor node. For local develploment we use defaults user credentials below:

- username 'transeptor'
- password 'mydevpwd'

```bash
influx user create -n transeptor -p mydevpwd
```

Verify created entries with:

```bash
influx bucket list
influx user list
```

Leave InfluxDB shell.
```bash
exit
```

InfluxDB is now running and configured to store metrics for Transeptor.

## Setting up Prometheus Docker
## Setting up Grafana Docker