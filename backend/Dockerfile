# Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app

# copy package.json and lockfile first (cache deps)
COPY package*.json ./
# install deps
RUN npm ci --production=false

# copy source
COPY . .

# build TS to /app/dist
RUN npm run build

# Stage 2: runtime
FROM node:18-alpine AS runner
WORKDIR /app

# production deps only
COPY package*.json ./
RUN npm ci --production=true

# copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
# copy other necessary runtime files (views, public) if any
# copy config example or README if you want
# set env for production (overrideable via docker run / compose)
ENV NODE_ENV=production
ENV PORT=3000

# expose port
EXPOSE 3000

# use the compiled JS entrypoint
CMD ["node", "dist/index.js"]
