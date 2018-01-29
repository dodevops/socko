# Dockerfile for SOCKO!
# This Dockerfile generates an image for SOCKO

# Build upon supported Node.js version

FROM node:8

# Require arguments

ARG date
ARG rev
ARG version
ARG npm_version

# Set labels

LABEL org.label-schema.build-date=${date} \
      org.label-schema.name="socko" \
      org.label-schema.description="A dockerized SOCKO!" \
      org.label-schema.usage="https://github.com/dodevops/socko/blob/master/README.md" \
      org.label-schema.url="https://github.com/dodevops/socko" \
      org.label-schema.vcs-url="https://github.com/dodevops/socko" \
      org.label-schema.vcs-ref=${rev} \
      org.label-schema.vendor="DO! DevOps" \
      org.label-schema.version=${version} \
      org.label-schema.schema-version="1.0" \
      org.label-schema.docker.cmd.devel="docker run -d -v `pwd`:/socko dodevops/socko:latest --loglevel debug" \
      org.label-schema.docker.cmd.test="docker run -d -v `pwd`/../test/baseman/default/case-basic-1/assets/:/socko devops/socko:latest --input /socko/input --output /socko/output" \
      org.label-schema.docker.debug="docker run -it --entrypoint /bin/bash $CONTAINER"

# Install socko globally

RUN npm install -g socko${npm_version}

# Set socko runtime as entrypoint

ENTRYPOINT ["socko"]
