FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache curl gnupg \
  && (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler
ENV DOPPLER_CONFIG=prd

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8082
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "weave-engine", "--config", "prd", "--", "npm", "start"]