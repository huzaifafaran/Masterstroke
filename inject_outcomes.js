const fs = require('fs');

let code = fs.readFileSync('js/commentary.js', 'utf-8');
const newMethodsFile = fs.readFileSync('js/commentary_outcomes.js', 'utf-8');
const start = newMethodsFile.indexOf('{') + 1;
const end = newMethodsFile.lastIndexOf('}');
const methodsOnly = newMethodsFile.substring(start, end).trim();

const methodsToReplace = ['wicketLine', 'sixLine', 'fourLine', 'runLine', 'dotLine'];

methodsToReplace.forEach(method => {
    // Find where the method begins in commentary.js
    const startRegex = new RegExp(`    ${method}\\(result, batter, bowler, context\\) \\{`);
    const startIndex = code.search(startRegex);
    
    if (startIndex === -1) {
        console.log(`Could not find ${method} in commentary.js`);
        return;
    }

    let bracketCount = 0;
    let i = startIndex;
    let foundStart = false;
    
    while(i < code.length) {
        if (code[i] === '{') {
            bracketCount++;
            foundStart = true;
        } else if (code[i] === '}') {
            bracketCount--;
        }
        
        if (foundStart && bracketCount === 0) {
            break;
        }
        i++;
    }
    
    // Include any trailing newline
    let endIndex = i + 1;

    // Find the new method inside methodsOnly
    const newStartIndex = methodsOnly.search(startRegex);
    let newBracketCount = 0;
    let j = newStartIndex;
    let newFoundStart = false;
    while(j < methodsOnly.length) {
        if (methodsOnly[j] === '{') {
            newBracketCount++;
            newFoundStart = true;
        } else if (methodsOnly[j] === '}') {
            newBracketCount--;
        }
        
        if (newFoundStart && newBracketCount === 0) {
            break;
        }
        j++;
    }
    const newMethodCode = methodsOnly.substring(newStartIndex, j + 1);
    
    console.log(`Replacing ${method}...`);
    code = code.substring(0, startIndex) + newMethodCode + code.substring(endIndex);
});

fs.writeFileSync('js/commentary.js', code);
console.log('Update complete.');
