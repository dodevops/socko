![SOCKO!](SockoLogo.png)

# SOCKO! - Hierarchical file weaver. [![Build Status](https://travis-ci.org/dodevops/socko.svg?branch=master)](https://travis-ci.org/dodevops/socko) [![Coverage Status](https://coveralls.io/repos/github/dodevops/socko/badge.svg?branch=master)](https://coveralls.io/github/dodevops/socko?branch=master) [![npm](https://img.shields.io/npm/v/socko.svg)](https://www.npmjs.com/package/socko)

## Introduction

SOCKO! is a file builder, that takes an input directory of files and applies
various features based on a hierarchy directory to produce an output.

It is typically used for configuration management.

## The SOCKO! framework

This module dubbed "SOCKO!" is merely a frontend to the socko framework. It uses socko-converter-file to produce a logical
hierarchy for the socko-api, which does the heavy lifting. Its output is again mapped by socko-converter-file to a
file structure.

## How SOCKO! works

SOCKO! reads an _input_ directory file by file and applies various features to the encountered files based on a
_node_ in the _hierarchy_ directory, which typically resides as "_socko" directly underneath the _input_ directory, but can also be
placed elsewhere. In the end, everything is put into an _output_ directory.

Because of its hierarchical features, SOCKO! can overwrite basic settings with settings in higher nodes.

## Usage

SOCKO! is a cli application that can be run by calling

    socko generate

and specifying at least these arguments:

* --input: Path to the _input_ directory
* --node: Node in the _hierarchy_ directory
* --output: Path to the _output_ directory
* --hierarchy: Path to the _hierarchy_ directory (optional, uses the directory _socko under the _input_ directory if not set)

Nodes are referenced as directories directly underneath the _hierarchy_ directory. You can also use nodes beneath other nodes, by using the first node name, a : and the second node name (nodeA:nodeB).

For more arguments, see

    socko generate --help

## Docker

If you don't want to or can't use Node.js on your local machine, but have [Docker](https://docker.com) at hand, you can use our docker image for working with SOCKO!. For details, see the description in the repository over at [Docker Hub](https://hub.docker.com/r/dodevops/socko/).

## SOCKO! features

### Overrides

SOCKO! can override files found in the _input_ directory with files from a _hierarchy_ node, if their filenames match.

#### Example

##### Setup

* input
  - SimpleTextFile.txt
    ```
    Input content
    ```
* hierarchy
  - nodeA
    - nodeB
      - SimpleTextFile.txt
      ```
      Content from nodeB
      ```

##### Generated output

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA
```

* output
  - SimpleTextFile.txt
    ```
    Input content
    ```

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA:nodeB
```

* output
  - SimpleTextFile.txt
    ```
    Content from nodeB
    ```

### Sockets

SOCKO! can merge together _socket_- with _cartridge_-files (thus the name). _Socket_ files
hold different places (called _cartridge-slot_s), where cartridges should be placed.

These cartridges can either be specified by a single name or as a pattern, forming a
_cartridge collector_.

_Socket_-files live in the _input_ directory and have the prefix .socket, while _cartridge_-files live in the _hierarchy_ directory and have the prefix .cartridge.

_Cartridge slot_s are defined by placing a special text inside a _socket_ file. To support multiple text formats, SOCKO! provides multiple formats of this special text, called _flavour_s.

Please see the [socko-converter-file](https://www.npmjs.com/package/socko-converter-file) documentation for details about the available flavours.

#### Example

##### Setup

* input
  - SimpleTextFile.txt.socket
    ```
    This is a socket.
    {{<< SOCKO: MyCartridge.txt >>}}
    ```
* hierarchy
  - nodeA
    - nodeB
      - MyCartridge.txt.cartridge
      ```
      Cartridge content
      ```

##### Generated output

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA
```

=> Error, because no cartridge can be found

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA:nodeB
```

* output
  - SimpleTextFile.txt
  ```
  This is a socket.
  Cartridge content
  ```

### Buckets

SOCKO! can fill up directories in the _input_ directory with files from the _hierarchy_ in the same directory. These so-called _bucket_ directories hold just one file called .socko.include. This file holds a special pattern which denotes, which files should be placed into the bucket.

Please see the [socko-converter-file](https://www.npmjs.com/package/socko-converter-file) documentation for details.

#### Example

##### Setup

* input
  - MyBucket
    - .socko.include
      ```
      0:G:BucketEntry*
      ```
  - MySecondBucket
    - .socko.include
      ```
      -1:G:BucketEntry*
      ```
* hierarchy
  - nodeA
    - MyBucket
      - BucketEntry1.txt
        ```
        Bucket entry 1 in nodeA
        ```
    - MySecondBucket
      - BucketEntry1.txt
        ```
        Bucket entry 1 in nodeA
        ```
    - nodeB
      - MyBucket
        - BucketEntry1.txt
        ```
        Bucket entry 1 in nodeA:nodeB
        ```
        - BucketEntry2.txt
        ```
        Bucket entry 2 in nodeB:nodeB
        ```
      - MySecondBucket
        - BucketEntry2.txt
          ```
          Bucket entry 2 in nodeB:nodeB
          ```

##### Generated output

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA
```

* output
  - MyBucket
    - BucketEntry1.txt
      ```
      Bucket entry 1 in nodeA
      ```
  - MySecondBucket
    - BucketEntry1.txt
      ```
      Bucket entry 1 in nodeA
      ```

```
socko generate --input input --hierarchy hierarchy --output output --node nodeA:nodeB
```

* output
  - MyBucket
    - BucketEntry1.txt
      ```
      Bucket entry 1 in nodeA:nodeB
      ```
    - BucketEntry2.txt
      ```
      Bucket entry 2 in nodeA:nodeB
      ```
  - MySecondBucket
    - BucketEntry1.txt
      ```
      Bucket entry 1 in nodeA
      ```
    - BucketEntry2.txt
      ```
      Bucket entry 2 in nodeB:nodeB
      ```

Note, that MySecondBucket contains both the entries from nodeA and nodeA:nodeB, because the bucket was set up to search up to the root node, while it was configured to only use the first node in MyBucket.

## Ignoring cartridges

If you'd like to exclude specific cartridges (and thus leaving the part of
the socket file empty), you can add one or more "--ignore" parameters
together with cartridge file names.

You can also specify to exclude cartridges on a specific node path by prefixing
--ignore with <NODEPATH>=. The node-path is the absolute path starting with the _hierarchy_ directory, which is set to ":_root", so "nodeA:nodeB" is ":_root:nodeA:nodeB" in this case.

    socko --ignore :_root:nodeA:nodeB=dynamic_txt_content1 (...)

## Renaming files in flight

If you'd like to rename the files created during a SOCKO! run, you can use
the --rename argument. This argument can be specified multiple times and
should be in the form

    --rename source-path=destination-path

The paths should be relative to the input directory. If SOCKO! finds a path,
that matches _source-path_ during its run (in all features), it is
automatically translated to _destination-path_.

## Skipping recreation of files, that have the same content

Usually, SOCKO will simply flood your output directory with the generated files.
It does not check, if the new content is the same as the old content.

If you don't want this for some reason, add the parameter

    --skipIdenticalSockets

and SOCKO will check, if the files differ before it actually writes them.

## Migrating from SOCKO! 1

The following things have changed between SOCKO! 1 and 2 and should be checked and adjusted in your installation:

* The --rename paramter uses a "source-path=destination-path" now instead of "source-path:destination-path" now and only supports filenames, not paths.
* The --ignore-parameter uses a node-path before the cartridge-name and not a single node name any more.
* The bucket-pattern allows RegExps now, so the RegExp-type should be given as a second part. The former version is still supported, but marked as deprecated and will be removed in a future version
