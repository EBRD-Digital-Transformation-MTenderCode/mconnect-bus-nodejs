#!/usr/bin/env bash

if [[ $# != 0 ]]; then
    if [[ $1 == "prod" ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up && docker-compose down --rmi local
    elif [[ $1 == "dev" ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up && docker-compose down --rmi local
    else
        echo "Argument of environment can be 'prod' or 'dev', but entered - " $1
    fi
else
    echo "Must be argument of environment"
fi
