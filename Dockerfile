# syntax=docker/dockerfile:1.3
FROM node:17.1.0 AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY ./src ./src

RUN npm ci --quiet && npm run build

FROM node:17.8.0-alpine3.14 AS app

ENV NODE_ENV=production
ENV TZ=Europe/Budapest
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 \ 
  && chmod +x /usr/local/bin/dumb-init

WORKDIR /app

RUN apk update --no-cache \
  && apk upgrade --no-cache \
  && apk add --no-cache git \
  && deluser --remove-home node \
  && addgroup -S node -g 1001 \
  && adduser -S -G node -u 1001 node \
  && chmod u+s /bin/ping \
  && rm -rf /lib/apk \
  && rm -rf /etc/apk \
  && rm -rf /usr/share/apk \
  && rm -rf /sbin/apk \
  && rm -rf /opt/yarn* \
  && find ./ -name "*.md" -type f -delete \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -rf /usr/local/bin/LICENSE

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/build ./build

EXPOSE 8990

CMD ["/usr/local/bin/dumb-init", "node", "build/Main.js"]
