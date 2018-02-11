let MQ = undefined;

$(function(){
  // mathquill-ify our text box
  MQ = MathQuill.getInterface(2);

  let autoCommands = 'pi sqrt';
  let mathField = MQ.MathField($('#input')[0], {
    spaceBehavesLikeTab: true,
    sumStartsWithNEquals: true,
    supSubsRequireOperand: true,
    autoCommands: autoCommands,
    autoOperatorNames:'abs acos acosh acot acoth acsc acsch add asec asech asin asinh atan '+
  		'atanh bellNumbers bitAnd bitNot bitOr bitXor catalan cbrt ceil '+
  		'combinations complex composition concat conj cos cosh cot coth cross csc csch det distance dot dotDivide '+
  		'dotMultiply dotPow exp factorial fix floor gamma gcd hypot im inv kldivergence lcm leftShift log max mean median min mod '+
  		'mode nthRoot re rightArithShift rightLogShift round sec sech sign sin sinh sqrt std tan tanh trace transpose var',
    handlers:{
      enter:function(){

      },
      edit:function(){
        // de-latex it and push to the output
        let result = parseLatex(mathField.latex(), []);
        $('#output')[0].textContent = result;
      }
    }
  });
});
