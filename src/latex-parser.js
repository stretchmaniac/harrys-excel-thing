/// EDITED 2/11/2018 to work with excel

//converts a latex expression into and expression evaluatable by math.js
var singleArgFuncs = {
    '\\\\sinh':'sinh',
    '\\\\sin':'sin',
    '\\\\cosh':'cosh',
    '\\\\cos':'cos',
    '\\\\tanh':'tanh',
    '\\\\tan':'tan',
    '\\\\atanh':'atanh',
    '\\\\atan2':'atan2',
    '\\\\atan':'atan',
    '\\\\asinh':'asinh',
    '\\\\asin':'asin',
    '\\\\acosh':'acosh',
    '\\\\acos':'acos',
    '\\\\ln':'log',
    '\\\\sqrt':'sqrt',
    '\\\\min':'min',
    '\\\\max':'max',
    '\\\\log':'log',
    '\\\\csch':'csch',
    '\\\\csc':'csc',
    '\\\\sech':'sech',
    '\\\\sec':'sec',
    '\\\\stirlingS2':'stirlingS2'
}
//order is important
var variables;
function parseLatex(expression, vars){
    variables = ['e','pi'].concat(vars);

    expression = expression.replace(/\\pi/g, ' pi');
    //convert left and right parentheses to curly braces, as they should be
    expression = expression.replace(/\\left\(/g,'{');
    expression = expression.replace(/\\right\)/g,'}');
    expression = expression.replace(/\)/g,'}');
    expression = expression.replace(/\(/g,'{');
    expression = expression.replace(/\\left/g,'');
    expression = expression.replace(/\\right/g,'');

    //get rid of \operatorname{...} so that it can be a function (e.g. \operatorname{sech}(x) )
    var match;
    var regex;
    regex = /operatorname{/g;
    while((match=/operatorname{/g.exec(expression)) !== null){
        var index = match.index;
        //index of bracket
        var bIndex = index + 13;
        var endIndex = matchingRightChar('{','}',expression, bIndex);
        var middle = expression.substring(bIndex, endIndex);
        expression = expression.substring(0, index)+middle+' '+expression.substring(endIndex+1,expression.length);
    }

    //get rid of \text{...} so that it can be a function (e.g. \tex{exp})
    regex = /text{/g;
    while((match=regex.exec(expression)) !== null){
        index = match.index;
        //index of bracket
        bIndex = index + 5;
        endIndex = matchingRightChar('{','}',expression, bIndex);
        middle = expression.substring(bIndex, endIndex);
        expression = expression.substring(0, index)+middle+' '+expression.substring(endIndex+1,expression.length);
    }

    //enclose all variables in {} (for various reasons)
    for(var t = 0; t < variables.length; t++){
        var variable = variables[t];
        var reg = new RegExp(variable,'g');
        var varLocations = [];
        while((match = reg.exec(expression)) !== null){
            //if it can be extended to the left to a backslash, then it's not a variable
            //if it hits any non-letter before that, then it's a variable
            index = match.index;;
            var isVar = true;
            for(var subIndex = index; subIndex >= 0 ; subIndex--){
                var char = expression.charAt(subIndex);
                if(char.match(/\\/)){
                    isVar = false;
                    break;
                }
                if(char.match(/[^a-zA-Z]/)){
                    isVar = true;
                    break;
                }
            }
            if(isVar){
                varLocations.push(index);
            }
        }
        for(var u = varLocations.length - 1; u >=0 ; u--){
            var varIndex = varLocations[u];
            expression = expression.substring(0, varIndex)+'@'+variable+'?'+expression.substring(varIndex+variable.length,expression.length);
        }
    }

    //convert dot char to multiplication
    expression = expression.replace(/\\cdot/g,'*');

  	// replace any } followed by [ with }*[
  	// this was an issue because math.js thinks (cos(u))[...] is a lookup (as in an array)
  	// when we really want multiplication
  	expression = expression.replace(/}\[/g,'}*[');

    //remove spaces
    expression = expression.replace(/ /g, '');

    //the more complicated functions, however, take a little bit more effort.
    //we will do them individually
    //absolute value
    var re;
    re = /\|/g;
    while((match=re.exec(expression)) !== null){
        index = match.index;
        for(var k = expression.length - 1; k > index; k--){
            if(expression.charAt(k) === '|'){
                var middle = expression.substring(index+1, k);
                expression = expression.substring(0,index)+'abs{'+middle+'}'
                    +expression.substring(k+1,expression.length);
                    break;
            }
        }
    }

    //for all the easy functions, we can just insert the correct function if there is
    //parentheses, otherwise, it's a little more difficult
    for(var f in singleArgFuncs){
        re = new RegExp(f,'g');
        while((match=re.exec(expression)) !== null){
            var index = match.index;
            var nextChar = index + f.length - 1;

            if(expression.charAt(nextChar) === '{'){
                endIndex = matchingRightChar('{','}', expression, nextChar);
                expression = expression.substring(0, index)+singleArgFuncs[f]
                    +expression.substring(nextChar, expression.length)
            }else{
                //cut off at next non-multiplication or exponentation operation
                //examples: sin 2x^2 -> sin(2x^2)
                //(4+sin 2x)x -> (4+sin(2x))x
                //sin 4+x -> sin(4)+x
                //sin ln(x+4x-5) -> sin(ln(...))
                //sin ln x -> sin(ln(x))
                var goOn = true;
                var nextIndex = nextChar;
                var begIndex = nextChar;
                while(goOn){
                    var char = expression.charAt(nextIndex);
                    if(char === '{'){
                        nextIndex = matchingRightChar('{','}',expression, nextIndex)+1;
                        goOn = true;
                    }else if(char === '['){
                        nextIndex = matchingRightChar('[',']',expression ,nextIndex)+1;
                    }else if(char === '+' || char === '-' || char === '}' || char === ']' || char === ',' || char === '=' || nextIndex === expression.length){
                        nextIndex--;
                        goOn = false;
                    }else{
                        goOn = true;
                        nextIndex++;
                    }
                }
                var endIndex = nextIndex;
                expression = expression.substring(0,index)+singleArgFuncs[f]+
                    '{'+expression.substring(nextChar,endIndex+1)+'}'+expression.substring(endIndex+1, expression.length);
            }
        }
    }

    //fractions
	// the issue was that re.exec(expression) held prior data (namely, where the
	// last match was), so when expression changed, it didn't change where the match position was.
	// for nested fractions, this meant the nested fraction wasn't detected.
	let foundFrac = true;
	while(foundFrac){
		foundFrac = false;
		re = /\\frac/g;
		while((match=re.exec(expression)) !== null){
			//5 for length of "\frac"
			var index = match.index + 5;
			var endIndex = matchingRightChar('{','}',expression,index);
			var index2 = endIndex + 1;
			var endIndex2 = matchingRightChar('{','}',expression,index2);
			var arg1 = expression.substring(index,endIndex+1);
			var arg2 = expression.substring(index2,endIndex2+1);
			expression = '{'+expression.substring(0,match.index) + arg1 + '/' + arg2 + expression.substring(endIndex2+1,expression.length)+'}';
			foundFrac = true;
		}
	}

    //evaluate only the curly braces which are at the bottom of the chain
    //so they have no curly braces inside of them
    function curlyReplacer(match, innards){
        return '('+innards+')';
    }
    while(expression.match(/{([^\{\}]*)}/g)){
        expression = expression.replace(/{([^\{\}]*)}/g,curlyReplacer);
    }
    expression = expression.replace(/@/g,'(');
    expression = expression.replace(/\?/g,')')

    //really, we have the best chance of parsing if we omit backslashes
    expression = expression.replace(/\\/g,'');

    // EXCEL things
    // turn (pi) into (pi())
    expression = expression.replace(/\(pi\)/g,'(pi())');
    // turn (e) into (e())
    expression = expression.replace(/\(e\)/g,'(e())');
    // turn )[not parentheses] into )*(
    expression = expression.replace(/\)([\(a-zA-Z1-9])/g,')*$1');
    // any number not part of a function name that is directly to the left of a non-number, add a * to the right
    // find all the numbers
    for(let index = 0; index < expression.length - 1; index++){
      if(expression.charAt(index).match(/[0-9]/g)){
        // it's a number
        // first check if there is a non-number or left parentheses to the right of it
        if(expression.charAt(index + 1).match(/[a-zA-Z\(\[]/g)){
          // check if it is part of a function name
          let isFunctionName = false;
          for(let f in singleArgFuncs){
            let fString = singleArgFuncs[f];
            // check if the function name exists in expression and has indeces including index
            let reg = new RegExp(fString, 'g');
            let fMatch = null;
            while((fMatch=reg.exec(expression)) !== null){
              if(index > fMatch.index && index - fMatch.index < fString.length){
                isFunctionName = true;
              }
            }
            if(isFunctionName){
              break;
            }
          }
          if(!isFunctionName){
            // add a * after index
            expression = expression.substring(0,index+1)+'*'+expression.substring(index+1);
            index++;
          }
        }
      }
    }

    return expression;
}
//finds the matching } to a {. Returns the index of the matching }
//index is the index of the {. for braces, char = {, matchingChar = }
function matchingRightChar(char,matchingChar, exp, index){
    index++;
    var stack = 1;
    while(stack >= 1 && index<exp.length){
        if(exp.charAt(index) === matchingChar){
            stack--;
        }else if(exp.charAt(index) === char){
            stack++;
        }
        index++;
    }
    return index-1;
}
