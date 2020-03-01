#!/bin/bash

if [ -d "$PWD/dist" ];
  then node -r dotenv/config $PWD/dist/index.js dotenv_config_path=$PWD/.env.prod;
fi
