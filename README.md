This is the source code for http://markhansen.co.nz/stolen-vehicles-pt2/

How do you get this up and running?

Run a local web server in the folder. Unfortunately you can't just open it
using `file://`, because it uses AJAX to fetch the stolen vehicle data.

  $ cd stolen-vehicles-pt2
  $ python -m SimpleHTTPServer

And browse to localhost:8000/index.html.

The javascript is mostly compiled from coffeescript - feel free to edit either.
The same goes for the HTML compiled from Haml. A simple build file is included
to concatenate all the data together, rough 'n' ready. :)
