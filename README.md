# Transport Agent for MTender

## Re-Deploy on dev

1. Connect VPN for dev env;
2. Go to [Jenkins dev](https://dev.jenkins.eprocurement.systems) and run MConnect-BUS job;
3. After complete job remember version number of build;
4. Connect with SSH (10.0.20.125) to swarm.node1 on dev;
5. Go to /root/infrastructure and edit redeploy-mconnect-bus-nodejs.sh;
6. Change version number of docker image from jenkins build;
7. Need stop and delete old container - `docker container stop mconnect-bus-nodejs && docker container rm  mconnect-bus-nodejs`;
8. Run `./redeploy-mconnect-bus-nodejs.sh`.
