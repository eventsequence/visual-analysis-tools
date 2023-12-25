# event-thread

> Event Thread v3.0 Project

## Installation
Install NodeJS v8.11.2 [download](https://nodejs.org/en/download/).

This project uses Redis as cache for api request, so server end needs to install Redis v4.0.9 download the stable version on [official website](https://redis.io/download) or [directly download](http://download.redis.io/releases/redis-4.0.9.tar.gz)

``` bash
# after download
# Installation Redis
tar xzf redis-4.0.9.tar.gz
cd redis-4.0.9
make

# run Redis server
# you only need run it once, or re-run it when it does not work.
src/redis-server
```

Necessary python packages need to install: 
fastdtw, gensim, nose, scikit-learn, scikit-tensor, numpy, scipy

``` bash
# install vue
npm i vue-cli -g

# initialize project for the first time
# vue init webpack projectName 

# install dependencies
npm install
```
## Build Setup for Frontend
``` bash
# Please make sure under source/ directory
cd source

# serve with hot reload at 127.0.0.1:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Build Setup for Backend
``` bash
# Please make sure under source/ directory
cd source

# build for development with hot reload
npm install -g nodemon
npm run dev-api # please ensure there is nodemon in development environment

# build for production
npm run api
```