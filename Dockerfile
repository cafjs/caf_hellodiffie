# VERSION 0.1
# DOCKER-VERSION  1.7.0
# AUTHOR:         Antonio Lain <antlai@cafjs.com>
# DESCRIPTION:    Cloud Assistants application hellodiffie
# TO_BUILD:        cafjs mkImage . gcr.io/cafjs-k8/root-hellodiffie
# TO_RUN:         cafjs run --appImage gcr.io/cafjs-k8/root-hellodiffie hellodiffie

FROM node:10

EXPOSE 3000

RUN mkdir -p /usr/src

ENV PATH="/usr/src/node_modules/.bin:${PATH}"

RUN apt-get update && apt-get install -y rsync

COPY . /usr/src

RUN  cd /usr/src/app && yarn install  --ignore-optional && cafjs build &&  yarn install --production --ignore-optional && yarn cache clean

WORKDIR /usr/src/app

ENTRYPOINT ["node"]

CMD [ "./index.js" ]
