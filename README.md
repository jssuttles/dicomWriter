# dicomWriter

Works with https://github.com/jssuttles/dicomParser

Currently only compatible with node.js

Not at all polished.

```javascript
var dicomElements = dicomParser.parseDicom(someBuffer);
var changedWriterDataSet = new dicomWriter.DataSet(dicomElements.byteArrayParser, dicomElements.byteArray, dicomElements.elements);

changedWriterDataSet.changeString('x00100010', 'Bob');

changedWriterDataSet.finishedChanges();

var changedParserDataSet = new dicomParser.DataSet(changedWriterDataSet.byteArrayParser, changedWriterDataSet.byteArray, changedWriterDataSet.elements);

changedParserDataSet.string('x00100010'); // should be Bob
```

Due to my inexperience with git, I changed some stuff with dicomParser that was thought to be unnecessary to a general pull request. So, I reverted commit c55297fd428aaf4f68067ed2cadee87c576e3765.

That is currently necessary for this to work.
