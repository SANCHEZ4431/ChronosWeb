FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libzip-dev unzip \
  && docker-php-ext-install pdo pdo_mysql mysqli zip

RUN a2enmod rewrite

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html
