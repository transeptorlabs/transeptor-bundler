<!-- TODO: Turn notes into automated github workflow -->
## Update version
update version in package.json

# Build Docker images
docker build -t bundler-typescript:v<verion_number> .

# Log into Docker hub
docker login -u transeptorlabs

# Rename image to remote repo name
docker tag bundler-typescript:v<verion_number> transeptorlabs/bundler:v<verion_number>
docker tag bundler-typescript:v<verion_number> transeptorlabs/bundler:latest

## Push image
docker push transeptorlabs/bundler:v<verion_number>
docker push transeptorlabs/bundler:latest

