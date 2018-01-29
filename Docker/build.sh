#!/bin/bash

if [ -x /usr/local/bin/gdate ]
then
    # We're on a mac with a brew-installed gdate (brew install coreutils)
    DATE=`/usr/local/bin/gdate --rfc-3339=seconds`
else
    DATE=`date --rfc-3339=seconds`
fi

GITREV=`git rev-parse --short HEAD`

if [ $# -eq 0 ]
then
    VERSION="latest"
    NPM_VERSION=""
else
    VERSION=$1
    NPM_VERSION="@$1"
fi

docker build -t dodevops/socko:$VERSION --build-arg date="${DATE}" --build-arg rev="${GITREV}" --build-arg version="${VERSION}" --build-arg npm_version="${NPM_VERSION}" .
