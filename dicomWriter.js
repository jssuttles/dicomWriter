(function (root, factory) {

    // node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    }
    else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        if(typeof cornerstone === 'undefined'){
            dicomWriter = {};

            // meteor
            if (typeof Package !== 'undefined') {
                root.dicomWriter = dicomWriter;
            }
        }
        dicomWriter = factory();
    }
}(this, function () {

/**
 * Utility functions for dealing with DICOM
 */

var dicomWriter = (function (dicomWriter)
{
    "use strict";

    if(dicomWriter === undefined)
    {
        dicomWriter = {};
    }

    var stringVrs = {
        AE: true,
        AS: true,
        AT: false,
        CS: true,
        DA: true,
        DS: true,
        DT: true,
        FL: false,
        FD: false,
        IS: true,
        LO: true,
        LT: true,
        OB: false,
        OD: false,
        OF: false,
        OW: false,
        PN: true,
        SH: true,
        SL: false,
        SQ: false,
        SS: false,
        ST: true,
        TM: true,
        UI: true,
        UL: false,
        UN: undefined, // dunno
        UR: true,
        US: false,
        UT: true
    };

    /**
     * Tests to see if vr is a string or not.
     * @param vr
     * @returns true if string, false it not string, undefined if unknown vr or UN type
     */
    dicomWriter.isStringVr = function(vr)
    {
        return stringVrs[vr];
    };

    /**
     * Tests to see if a given tag in the format xggggeeee is a private tag or not
     * @param tag
     * @returns {boolean}
     */
    dicomWriter.isPrivateTag = function(tag)
    {
        var lastGroupDigit = parseInt(tag[4]);
        var groupIsOdd = (lastGroupDigit % 2) === 1;
        return groupIsOdd;
    };



    return dicomWriter;
}(dicomWriter));

/**
 *
 * The DataSet class encapsulates a collection of DICOM Elements and provides various functions
 * to access the data in those elements
 *
 * Rules for handling padded spaces:
 * DS = Strip leading and trailing spaces
 * DT = Strip trailing spaces
 * IS = Strip leading and trailing spaces
 * PN = Strip trailing spaces
 * TM = Strip trailing spaces
 * AE = Strip leading and trailing spaces
 * CS = Strip leading and trailing spaces
 * SH = Strip leading and trailing spaces
 * LO = Strip leading and trailing spaces
 * LT = Strip trailing spaces
 * ST = Strip trailing spaces
 * UT = Strip trailing spaces
 *
 */
var dicomWriter = (function (dicomWriter)
{
    "use strict";

    if(dicomWriter === undefined)
    {
        dicomWriter = {};
    }

    function getByteArrayParser(element, defaultParser)
    {
        return (element.parser !== undefined ? element.parser : defaultParser);
    }


    function getDataLengthSizeInBytesForVR(vr)
    {
        if( vr === 'OB' ||
            vr === 'OW' ||
            vr === 'SQ' ||
            vr === 'OF' ||
            vr === 'UT' ||
            vr === 'UN')
        {
            return 4;
        }
        else
        {
            return 2;
        }
    }

    /**
     * Constructs a new DataSet given byteArray and collection of elements
     * @param byteArrayParser
     * @param byteArray
     * @param elements
     * @constructor
     */
    dicomWriter.DataSet = function(byteArrayParser, byteArray, elements)
    {
        this.byteArrayParser = byteArrayParser;
        this.byteArray = Buffer.from(byteArray)
        this.elements = elements;
        this.offsetChanges = [];
        this.totalOffsetChanges = [];
    };


    dicomWriter.DataSet.prototype.getOffsetChange = function(element) {
      var offsetChange = 0;
      var currOffset = element.offset;
      this.offsetChanges.forEach(function(offsetChange) {
        if (offsetChange.offset < currOffset) {
          offsetChange += offsetChange.change;
        }
      });
      return offsetChange;
    };
    /**
     * Returns a string for the element.  If index is provided, the element is assumed to be
     * multi-valued and will return the component specified by index.  Undefined is returned
     * if there is no component with the specified index, the element does not exist or is zero length.
     *
     * Use this function for VR types of AE, CS, SH and LO
     *
     * @param tag The DICOM tag in the format xGGGGEEEE
     * @param index the index of the desired value in a multi valued string or undefined for the entire string
     * @returns {*}
     */
    dicomWriter.DataSet.prototype.changeString = function(tag, newString)
    {
        var element = this.elements[tag];
        if(element && element.length > 0 && dicomWriter.isStringVr(element.vr))
        {
          var dataOffset = element.dataOffset + this.getOffsetChange(element);
          var result = dicomWriter.writeFixedString(this.byteArray, dataOffset, element.length, newString);
          this.byteArray = result.byteArray;
          var newLength = result.newLength;
          var diff = newLength - element.length;
          element.length = newLength;
          if (element.parser) { // explicit
            var dataLengthSizeBytes = getDataLengthSizeInBytesForVR(element.vr);
            if (dataLengthSizeBytes === 2) {
              if (element.parser.bigEndian) {
                this.byteArray.writeUInt16BE(newLength, element.dataOffset - dataLengthSizeBytes);
              } else {
                this.byteArray.writeUInt16LE(newLength, element.dataOffset - dataLengthSizeBytes);
              }
            } else {
              if (element.parser.bigEndian) {
                this.byteArray.writeUInt32BE(newLength, element.dataOffset - dataLengthSizeBytes);
              } else {
                this.byteArray.writeUInt32LE(newLength, element.dataOffset - dataLengthSizeBytes);
              }
            }
          } else {
            if (this.byteArrayParser.bigEndian) {
              this.byteArray.writeUInt32BE(newLength, element.dataOffset - 4);
            } else {
              this.byteArray.writeUInt32LE(newLength, element.dataOffset - 4);
            }
          }
          this.offsetChanges.push({offset: element.dataOffset, change: diff});
          return true;
        }
        return undefined;
    };

    dicomWriter.DataSet.prototype.setupTotalOffsets = function() {
      var totalOffsetChange = 0;
      this.offsetChanges.sort(function(a, b) {
        if (a.offset > b.offset) {
          return 1;
        } else if (a.offset < b.offset) {
          return -1;
        } else {
          return 0;
        }
      });
      this.totalOffsetChanges = this.offsetChanges.map(function(offsetChange) {
        totalOffsetChange += offsetChange.change;
        return {offset: offsetChange.offset, change: totalOffsetChange};
      });
      this.totalOffsetChanges.sort(function(a, b) {
        if (a.offset > b.offset) {
          return -1;
        } else if (a.offset < b.offset) {
          return 1;
        } else {
          return 0;
        }
      });
    };

    dicomWriter.DataSet.prototype.getTotalOffsetChange = function(element) {
      var offsetChange = 0;
      var currOffset = element.offset;
      this.totalOffsetChanges.find(function(totalOffsetChange) {
        return totalOffsetChange.offset > currOffset;
      });
      return offsetChange;
    };

    /**
     * Returns a string for the element.  If index is provided, the element is assumed to be
     * multi-valued and will return the component specified by index.  Undefined is returned
     * if there is no component with the specified index, the element does not exist or is zero length.
     *
     * Use this function for VR types of AE, CS, SH and LO
     *
     * @param tag The DICOM tag in the format xGGGGEEEE
     * @param index the index of the desired value in a multi valued string or undefined for the entire string
     * @returns {*}
     */
    dicomWriter.DataSet.prototype.finishedChanges = function()
    {
      this.setupTotalOffsets();
      for (var tag in this.elements) {
        if (this.elements.hasOwnProperty(tag)) {
          var element = this.elements[tag];
          element.dataOffset = element.dataOffset + this.getTotalOffsetChange(element);
        }
      }
    };

    //dicomWriter.DataSet = DataSet;

    return dicomWriter;
}(dicomWriter));

/**
 * Internal helper functions common to parsing byte arrays of any type
 */

var dicomWriter = (function (dicomWriter)
{
    "use strict";

    if(dicomWriter === undefined)
    {
        dicomWriter = {};
    }

    /**
     * Reads a string of 8-bit characters from an array of bytes and advances
     * the position by length bytes.  A null terminator will end the string
     * but will not effect advancement of the position.  Trailing and leading
     * spaces are preserved (not trimmed)
     * @param byteArray the byteArray to read from
     * @param position the position in the byte array to read from
     * @param length the maximum number of bytes to parse
     * @returns {string} the parsed string
     * @throws error if buffer overread would occur
     * @access private
     */
    dicomWriter.writeFixedString = function(byteArray, position, length, newString)
    {
        if(length < 0)
        {
            throw 'dicomWriter.writeFixedString - length cannot be less than 0';
        }

        if(position + length > byteArray.length) {
            throw 'dicomWriter.writeFixedString: attempt to read past end of buffer';
        }

        var newLength = 0;
        var newBuffer = [];
        var stringLength = newString.length;
        for(var i = 0; i < stringLength; i++) {
          newBuffer.push(newString.charCodeAt(i));
          newLength++;
        }
        var buffer = Buffer.from(newBuffer);
        byteArray = Buffer.concat([byteArray.slice(0, position), buffer, byteArray.slice(position + length)]);

        return {byteArray: byteArray, newLength: newLength};
    };


    return dicomWriter;
}(dicomWriter));


/**
 * Version
 */

var dicomWriter = (function (dicomWriter)
{
  "use strict";

  if(dicomWriter === undefined)
  {
    dicomWriter = {};
  }

  dicomWriter.version = "1.0.0";

  return dicomWriter;
}(dicomWriter));
    return dicomWriter;
}));
