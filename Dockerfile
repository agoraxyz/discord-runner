FROM node:15.14.0 AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY ./src ./src

RUN npm ci --quiet && npm run build

#
FROM node:15.14.0-alpine3.12


RUN apk update --no-cache \
    && apk upgrade --no-cache \
    && apk add --no-cache git

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY .env ./

RUN npm install

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

EXPOSE 8990

CMD ["npm", "run", "prod" ]