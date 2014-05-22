// THE LANGUAGE GOES HERE

// Below is Caramel.

function log(text){console.log(text);}

function isWhitespace(char) {
     return (char == " ") || (char == "\t") || (char == "\r") || (char == "\n") || (char == "\v");
}

// This function splits the input code and then, it can look for the next word
function CaramelLexer(text) {
	var position = 0;

	var words	= text.split(/\s+/);
	var next    = 0;
	this.nextWord = function () {
		if (position >= text.length) return null;
		while (isWhitespace(text.charAt(position))) {
			position ++;
			if (position >= text.length) return null;
		}
		var new_pos = position;
		while(!isWhitespace(text.charAt(new_pos))) {
			new_pos ++;
			if (new_pos >= text.length) break;
		}
		var collector = text.substring(position, new_pos);
		new_pos ++; position = new_pos;
		return collector;
	};

	this.nextCharsUpTo = function(char) {
		if (position >= text.length) return null;
		var new_pos = position;
		while(text.charAt(new_pos) != char) {
			new_pos ++;
			if (new_pos >= text.length)
				throw "Unexpected EOL";
		}
		var collector = text.substring(position, new_pos);
		new_pos ++; position = new_pos;
		return collector;
	};

}
var PrintingWords = {
	"PRINT": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var tos = terp.stack.pop(); 
		log(tos);
	},
	"P_STACK": function (terp) {
		log(terp.stack);
	},
	"INPUT": function(terp) {
		console.read(function(data){
			terp.stack.push(data);
		});
	}
};

var MathWords = {
	"+": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(_2os + tos);
	},
	"-": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(_2os - tos);
	},
	"*": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(_2os * tos);
	},
	"/": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(_2os / tos);
	},
	"SQRT": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		terp.stack.push(Math.sqrt(tos));
	}
};

var StackWords = {
	"DUP": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		terp.stack.push(tos);
		terp.stack.push(tos);
	},
	"DROP": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		terp.stack.pop();
	},
	"SWAP": function (terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(tos);
		terp.stack.push(_2os);
	},
	"OVER": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		terp.stack.push(_2os);
		terp.stack.push(tos);
		terp.stack.push(_2os);
	},
	"ROT": function(terp) {
		if (terp.stack.length < 3) throw "Not enough items on stack";
		var tos = terp.stack.pop();
		var _2os = terp.stack.pop();
		var _3os = terp.stack.pop();
		terp.stack.push(_2os);
		terp.stack.push(tos);
		terp.stack.push(_3os);
	}
};

function makeVariable(terp) {
	var me = {value: 0};
	return function() { terp.stack.push(me);};
}

var VariableWords = {
	"VAR": function(terp) {
		var var_name = terp.lexer.nextWord();
		if (var_name === null) throw "Unexpected EOL";

		terp.define(var_name, makeVariable(terp));
	},
	"STORE": function(terp) {
		if (terp.stack.length < 2) throw "Not enough items on stack";
		var reference = terp.stack.pop();
		var new_value = terp.stack.pop();
		reference.value = new_value;
	},
	"FETCH": function (terp) {
		if(terp.stack.length < 1) throw "Not enough items on stack";
		var reference = terp.stack.pop();
		terp.stack.push(reference.value);
	}
};

function makeConstant(value, terp) {
	return function() {terp.stack.push(value); };
}

var ConstantWords = {
	"CONST": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var const_name = terp.lexer.nextWord();
		if (const_name === null) throw "Unexpected EOL";

		var const_value = terp.stack.pop();
		terp.define(const_name, makeConstant(const_value, terp));
	}
};

var StringWords = {
	"\"": function(terp) {
		terp.stack.push(terp.lexer.nextCharsUpTo("\""));
	}
};

var CommentWords = {
	"/*": function(terp) {
		do {
			var next_word = terp.lexer.nextWord();
			if(next_word === null) throw "Unexpected EOL";
		} while (next_word.substr(-2, 2) != "*/");
	}
};
PrintingWords.INPUT.immediate = true;
VariableWords.VAR.immediate = true;
ConstantWords.CONST.immediate = true;
StringWords["\""].immediate = true;

CommentWords["/*"].immediate = true;

function makeWord(code) {
	return function(terp) {
		var old_pointer = terp.code_pointer;
		terp.code_pointer = 0;
		while (terp.code_pointer < code.length) {
			terp.interpret(code[terp.code_pointer]);
			terp.code_pointer++;
		}
		terp.code_pointer = old_pointer;
	};
}

var CompilingWords = {
	"DEF": function(terp) {
		var new_word = terp.lexer.nextWord();
		if (new_word === null) throw "Unexpected EOL";
		terp.latest = new_word;
		terp.startCompiling();
	},
	"END": function(terp) {
		var new_code = terp.stack.slice(0);
		terp.stack.length = 0;
		terp.define(terp.latest, makeWord(new_code));
		terp.stopCompiling();
	}
};

CompilingWords["DEF"].immediate = true;
CompilingWords["END"].immediate = true;

var ListWords = {
	"[": function(terp) {
		var list = [];
		var old_stack = terp.stack;
		terp.stack = list;
		do {
			var next_word = terp.lexer.nextWord();
			if (next_word === null) throw "Unexpected EOL";
			if(next_word == "]") break;

			next_word = terp.compile(next_word);
			if(next_word.immediate)
				terp.interpret(next_word);
			else
				terp.stack.push(next_word);
		} while(true);

		terp.stack = old_stack;
		terp.stack.push(list);
	}
};

ListWords.LENGTH = function(terp) {
	if (terp.stack.length < 1) throw "Not enough items on stack";
	var temp = terp.stack.pop();
	terp.stack.push(temp.length);
};

ListWords.ITEM = function(terp) {
	if(terp.stack.length < 2) throw "Not enough items on stack";
	var key = terp.stack.pop();
	var obj = terp.stack.pop();
	if(typeof obj == 'object') {
		terp.stack.push(obj[key]);
	} else {
		throw "Object expected";
	}
};

ListWords["["].immediate = true;

var ControlWords = {
	"RUN": function(terp) {
		if(terp.stack.length < 1) throw "Not enough items on stack";
		var temp = terp.stack.pop();
		if (temp.constructor != Array) throw "List expected";

		terp.interpret(makeWord(temp));
	},
	"?CONTINUE": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var cond = terp.stack.pop();
		if (cond) terp.code_pointer = Infinity;
	},
	"?BREAK": function(terp) {
		if (terp.stack.length < 1) throw "Not enough items on stack";
		var code = terp.stack.pop();
		if(code.constructor != Array) throw "List Expected!";

		var code_word = makeWord(code);
		var old_break_state = terp.break_state;
		terp.break_state = false;
		do { code_word(terp); } while (!terp.break_state);
		terp.break_state = old_break_state;
	}
};

function Caramel () {
	var dictionary = {};
	var data_stack = [];
	var compile_buffer = [];

	this.stack = data_stack;
	this.immediate = false;

	this.compile = function(word) {
		var word = word.toUpperCase();
		var num_val = parseFloat(word);
		if (dictionary[word]) {
			this.immediate = dictionary[word].immediate;
			return dictionary[word];
		} else if (!isNaN(num_val)) {
			return num_val;
		} else {
			throw "Unknown word";
		}
	};

	this.addWords = function(new_dict) {
		for(var word in new_dict) {
			dictionary[word.toUpperCase()] = new_dict[word];
		}
	};

	this.lookup = function(word) {return dictionary[word];};

	this.define = function(word, code) {
		dictionary[word.toUpperCase()] = code;
	};

	this.run = function(text){
		this.lexer = new CaramelLexer(text);
		var word;
		
		while (word = this.lexer.nextWord()) {
			word = this.compile(word);
			if (this.immediate) {
				this.interpret(word);
				this.immediate = false;
			} else if (this.isCompiling()) {
				this.stack.push(word);
			} else {
				this.interpret(word);
			}
		}
	};

	this.interpret = function(word) {
		if (typeof(word) == 'function') {
			word(this);
		} else {
			this.stack.push(word);
		}
	};

	this.startCompiling = function () {
		this.stack = compile_buffer;
	};

	this.stopCompiling = function(){
		this.stack = data_stack;
	};

	this.isCompiling = function() {
		return this.stack == compile_buffer;
	};
}

// First, we'll bring up Caramel's interpreter
var interpreter = new Caramel();
// We're going to need to add functionality
// Caramel allows us to develop seperate "words" and then add them here

// First, we want the ability to print expressions as well as our stack
interpreter.addWords(PrintingWords);
// What's a programming language without some math?
interpreter.addWords(MathWords);
// Now we can create and manipulate variables
interpreter.addWords(VariableWords);
// And constants
interpreter.addWords(ConstantWords);
// Now we can work with strings
interpreter.addWords(StringWords);
// And create lists
interpreter.addWords(ListWords);
// Interact with out stack
interpreter.addWords(StackWords);
// Write Comments
interpreter.addWords(CommentWords);
// And make more complicated control structures
interpreter.addWords(ControlWords);


interpreter.run('');

// Above is Caramel.

// Harker Programming Club
// HPL Language

// Credits:
// CLUB MEMBERS
  // Ryan Adolf
  // Ayush Alag
  // Rose Guan
  // Austin Hou
  // Shafieen Ibrahim
  // David Melisso
  // Rithvik Panchapakesan
  // Ayush Pancholy
  // Nishant Ravi
  // Akshay Ravoor
  // Ashwin Reddy
  // Keval Shah
  
// SOMEWHAT INCONSEQUENTIAL INDEFINITE INTEGRAL PERSONS
  // Ryan Adolf
  // Rose Guan
  // Ayush Pancholy
  // Ashwin Reddy
  
// CLUB MOTTO CREATOR
  // Ashwin Reddy
  // The Harker School
  
// EXECUTIVE CLUB FOUNDER
  // Ayush Pancholy

// SPECIAL THANKS
  // Michael Schmidt
  // The Harker School
  
// CLUB MOTTO
  // "Enitor Alte, Habete Ludum"
  // "Climb High, Have Game"
  
// THANK YOU
