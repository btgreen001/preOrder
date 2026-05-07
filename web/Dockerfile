# Angular 20 production build Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm install -g @angular/cli
RUN ng build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist/angular-client-new/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]