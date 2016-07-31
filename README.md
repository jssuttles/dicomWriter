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
