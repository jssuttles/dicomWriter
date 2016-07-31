# dicomWriter

Works with https://github.com/jssuttles/dicomParser

Currently only compatible with node.js

Not at all polished.

```javascript
var dicomElements = dicomParser.parseDicom(someBuffer);
var changedDataSet = new dicomWriter.DataSet(dicomElements.byteArrayParser, dicomElements.byteArray, dicomElements.elements);

changedDataSet.changeString('x00100010', 'Bob');

changedDataSet.finishedChanges();

var changedDataSet = new dicomParser.DataSet(changedDataSet.byteArrayParser, changedDataSet.byteArray, changedDataSet.elements);

changedDataSet.string('x00100010'); // should be Bob
```
