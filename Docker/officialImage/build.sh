#!/bin/bash

if [ -x /usr/local/bin/gdate ]
then
    # We're on a mac with a brew-installed gdate (brew install coreutils)
    DATE=`/usr/local/bin/gdate --rfc-3339=seconds`
else
    DATE=`date --rfc-3339=seconds`
fi

GITREV=`git rev-parse --short HEAD`

TAG="-t dodevops/socko:"

if [ $# -eq 0 ]
then
    TAG="${TAG}latest"
    NPM_VERSION=""
elif [ "$1" == "release" ]
then
    VERSION=`cat ../../package.json | jq -r .version`
    MAJOR=`echo ${VERSION} | cut -d "." -f 1`
    MINOR=`echo ${VERSION} | cut -d "." -f 1,2`
    TAG="${TAG}latest -t dodevops/socko:${VERSION} -t dodevops/socko:${MAJOR} -t dodevops/socko:${MINOR}"
    NPM_VERSION="@${VERSION}"
else
    TAG="${TAG}$1"
    NPM_VERSION="@$1"
fi

docker build ${TAG} --build-arg date="${DATE}" --build-arg rev="${GITREV}" --build-arg version="${VERSION}" --build-arg npm_version="${NPM_VERSION}" .

if [ "$1" == "release" ]
then
    for TAG_VERSION in `echo ${TAG} | cut -d " " -f 2,4,6,8`
    do
        docker push ${TAG_VERSION}
    done
fi
