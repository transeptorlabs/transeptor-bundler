## Running Transeptor

Transeptor offers many options for installing and running the bundler node.

### Build from source

Building Transeptor from source requires NodeJS and Yarn. Once you have installed the prerequisites, follow these steps to build Transeptor:
```bash
nvm use
yarn install
yarn build
chmod +x ./bin/transeptor
node ./bin/transeptor --help
```

### Docker
Quickly get Transeptor running on your machine using Docker.

The following command will start Transeptor using the latest stable release. Replace `<.path_to_your-env_file>` with the path to your `.env` file and `<http://your_ethererm_network_provider_url>` with the URL of your Ethereum network provider.
```bash
docker run -d --name transeptor -p 4337:4337 --env-file <.path_to_your-env_file> transeptorlabs/bundler:latest \
 --httpApi web3,eth,debug \
 --txMode base \
 --port 4337 \
 --network <http://your_ethererm_network_provider_url> \
 --auto 
```

#### Building Docker image

Building the Docker image from the source code requires that the Docker be installed on your machine. Once you have installed Docker, follow these steps to build the Docker image from source.

```bash
yarn build:image
```

Run image in the background
```bash
yarn start:image
```

stop image
```bash
yarn stop:image
```