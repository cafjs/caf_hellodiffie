# VERSION 0.1
# DOCKER-VERSION  1.7.0
# AUTHOR:         Antonio Lain <antlai@cafjs.com>
# DESCRIPTION:    Cloud Assistants application hellodiffie
# TO_BUILD:       docker build --rm -t registry.cafjs.com:32000/root-hellodiffie .
# TO_RUN:         docker run -p <app_port>:3000 -e DOCKER_APP_INTERNAL_PORT=3000 -e PORT0=<app_port> -e HOST=<host_ip> -e REDIS_PORT_6379_TCP_PORT=<redis_port>   registry.cafjs.com:32000/root-hellodiffie

FROM node:4.3

EXPOSE 3000

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN  touch /usr/src/app/http_proxy_build; . /usr/src/app/http_proxy_build;  rm -fr node_modules/*; rm -f npm-shrinkwrap.json; if test -f all.tgz; then tar zxvf all.tgz; fi; npm install  . ; npm run build ; rm -fr node_modules/nodeunit node_modules/browserify  node_modules/uglify-js; rm -f all.tgz

ENTRYPOINT ["node"]

CMD [ "./index.js" ]
