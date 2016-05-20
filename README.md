# SOCKO! - Hierarchical file weaver.

## Introduction

SOCKO! is a file generator, that copies multiple files in a directory 
hierarchy to build up its output. While doing that, SOCKO! also can stick
cartridges in named sockets to build completely new contents.

## How SOCKO! works

SOCKO! knows four verbs: a _hierarchy_, a _node_, a _socket_ and a _cartridge_.

The _hierarchy_ is a bunch of directories following a certain setup. These
directories define, how the output is going to be. A _node_ is one point
in this hierarchy. A _socket_ is a special file in the hierarchy, that depends
on _cartridges_ to built up its content.

Let's take a simple example:

We have three files. One file is a static file, that should simply be copied 
into the output directory. The other one is a _socket_-file. It has designated
 parts of the content, that should be exchanged with the contents of a
_cartridge_-file. The third one is also a static file, that simply
demonstrates, how SOCKO! works with subdirectories.

These files should be configured for four different nodes: nodeA, nodeB, nodeC 
and nodeC1.
  
So, our basic input directory looks like this:

    * input
    |
    *--* static.js
    *--* dynamic.js.socket
    |
    *--* subdirectory
    |  |
    *  *--* static.js
    |
    *--* _socko
       |
       *--* dynamic_content1.cartridge
       *--* dynamic_content2.cartridge
       |
       *--* nodeA
       |  |
       |  *--* dynamic_content1.cartridge
       |  
       *--* nodeB
       |  |
       |  *--* dynamic_content2.cartridge
       |
       *--* nodeC
          |
          *--* nodeC1
             |
             *--* dynamic_content1.cartridge
             *--* dynamic_content2.cartridge
             |
             *--* subdirectory
                |
                *--* static.js
             
In all cases, we would get the following output:

    * static.js
    * dynamic.js
    |
    *--* subdirectory
       |
       * static.js
       
But the content would depend on which node we selected.

    ./socko.js generate --input input --output output --node nodeA

If we, for example, select nodeA, we would get the two static files from the 
basic input directory and dynamic.js with its first content socket from nodeA
subdirectory and the second content from the _socko root directory.

    ./socko.js generate --input input --output output --node nodeB

For nodeB, we would get the two static files from the basic input directory as
well. This time the dynamic file would contain the first content socket from
the _socko root directory and the second content from the nodeB-directory.

    ./socko.js generate --input input --output output --node nodeC

For nodeC, the two dynamic content sockets from the _socko root directory 
would be used. The static files would stay the same.

    ./socko.js generate --input input --output output --node nodeC:nodeC1

For nodeC:nodeC1, finally, the two dynamic content sockets from the nodeC1-
 directory would be used and the static file in the subdirectory would also
 be used from the nodeC1-directory.
 
If you'd like to play with SOCKO!, you can use the sample directory to test 
with.
 
## Socket files

Socket files have the suffix .socket and may contain one or more cartridge
inclusion directives.

Because SOCKO! is file type-agnostic, there are different directives from
which you can choose, so your file validator still validates the socket files.

    XML-Style:
    
    <!-- SOCKO: CARTRIDGE-NAME -->
    
    JSON-Style (the , is optional):
    
    "_SOCKO!": "CARTRIDGE-NAME",
    
    Hash-Comment-Style:
    
    # SOCKO: CARTDRIDGE-NAME #
    
    Slash-Comment-Style:
    
    // SOCKO: CARTDRIDGE-NAME //
    
    Multiline-Slash-Comment-Style:
    
    /* SOCKO: CARTRIDGE-NAME */
    
    Native-Style:
    
    {{<< CARTRIDGE-NAME >>}}
    
In all cases, the directive has to be in one single line and the cartridge will
replace the whole line.

The parameter in the directive directly refers to a cartridge-file name.
 
For example, this directive:

    {{<< content1 >>}}

would look for a cartridge file named content1.cartridge.

Please note, that socket and cartridge files currently have to be UTF-8 encoded!

## Cartridge-Collectors

SOCKO! also supports specifying multiple cartridges to insert into a socket 
file in one line.

For this to work, instead of setting a cartridge name, do something like this:

    {{<< COLLECT:SCOPE:TYPE:NAME >>}}

If the cartridge name starts with "COLLECT:", SOCKO! understands it as a 
cartridge collector directive.

This directive has the following parts, separated by a ":".

* SCOPE: The scope defines how many levels SOCKO! will scan for matching 
  cartridge files. The value 0 only scans the current node. 
  The value 1 will also scan the parent node and so on.
  Specifying a "-" as the value will scan the complete hierarchy, up to the 
  root node.
* TYPE: There are different matching types available:
    * R: The parameter NAME is a regular expression, that has to match the 
      available cartridge names
    * G: The parameter NAME is a glob expression, that has to match the 
      available cartridge names
* NAME: expression, based on the TYPE-parameter
 
If there are no matches, the directive is simply removed from the output file.

## Ignoring cartridges

If you'd like to exclude specific cartridges (and thus leaving the part of 
the socket file empty), you can add one or more "--ignore" parameters 
together with cartridge file names.

You can also specify to exclude cartridges in a specific node by prefixing 
that node with <NODENAME>: like this:

    node socko.js --ignore nodeA:dynamic_txt_content1 (...)

## Requirements

* Node.js
* seeli
* winston
* handlebars
* merge

## Usage

Start socko by issuing

    node ./socko.js

Use "help" or "--help" to display the available options and commands.

## License

Copyright (c) 2016 Dennis Ploeger
Licensed under the MIT license.
