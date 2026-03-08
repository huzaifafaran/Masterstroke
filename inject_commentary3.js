const fs = require('fs');

const path = 'js/commentary.js';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add getPhysicsPrefix helper
const pickMethodOriginal = `    pick(arr) {`;
const physicsPrefixHelper = `    getPhysicsPrefix(result) {
        const contact = result.contactType;
        const timing = result.timingDetail;
        const shotType = result.shotType ? result.shotType.replace('_', ' ') : 'shot';

        let prefixPool = [];
        
        if (contact === 'weak') {
             if (shotType === 'lofted' || shotType === 'hook') {
                  prefixPool.push(\`Tried to go big, but mistimed it horribly!\`, \`Sliced the \${shotType}!\`, \`He didn't get hold of that \${shotType} at all!\`);
             } else {
                  prefixPool.push(\`A poor connection on the \${shotType}.\`, \`Mistimes the \${shotType} completely!\`, \`Off the toe of the bat!\`);
             }
        } else if (contact === 'edge') {
             prefixPool.push(\`Takes a thick edge!\`, \`Flashes hard and gets an edge!\`, \`Off the outside edge!\`);
        } else if (contact === 'miss') {
             if (timing === 'very_early' || timing === 'early') {
                  prefixPool.push(\`Way too early on the \${shotType} and misses completely!\`, \`Swings early and finds nothing but air!\`);
             } else if (timing === 'very_late' || timing === 'late') {
                  prefixPool.push(\`Beaten for pace! Too late on the \${shotType}.\`, \`Hurried into the stroke!\`);
             } else {
                  prefixPool.push(\`A swing and a miss!\`);
             }
        }

        if (prefixPool.length > 0 && this.maybe(0.85)) {
            return this.pick(prefixPool) + ' ';
        }
        return '';
    }

    pick(arr) {`;

if (!content.includes('getPhysicsPrefix(result)')) {
    content = content.replace(pickMethodOriginal, physicsPrefixHelper);
}


// We will replace the return statement with `const prefix = this.getPhysicsPrefix(result); return prefix + this.pick(pool);`
// in the outcome generators, BUT since I just modified wicketLine with hardcoded prefix logic, I need to restore it first.

// 2. Fix wicketLine (remove hardcoded prefix logic and use getPhysicsPrefix)
const wicketLineStart = `    wicketLine(result, batter, bowler, context) {
        const dismissalType = this.getDismissalType(result);
        const dismissalText = result.dismissal || 'is out';
        const phase = this.getPhase(context);
        const narrative = this.inferMatchNarrative(context);

        const contact = result.contactType;
        const timing = result.timingDetail;
        const shotType = result.shotType ? result.shotType.replace('_', ' ') : 'shot';

        let prefixPool = [];
        
        if (contact === 'miss') {
             if (timing === 'very_early' || timing === 'early') {
                  prefixPool.push(\`Way too early on the \${shotType} and misses completely!\`, \`Swings early and finds nothing but air!\`);
             } else if (timing === 'very_late' || timing === 'late') {
                  prefixPool.push(\`Beaten for pace! Too late on the \${shotType}.\`, \`Hurried into the stroke!\`);
             } else if (shotType === 'lofted') {
                  prefixPool.push(\`Went for the big lofted shot but completely missed!\`);
             } else {
                  prefixPool.push(\`A swing and a miss!\`);
             }
        } else if (contact === 'weak') {
             if (shotType === 'lofted') {
                  prefixPool.push(\`Tried to go big, but mistimed it horribly!\`, \`Sliced the lofted shot straight up in the air!\`);
             } else {
                  prefixPool.push(\`A poor connection on the \${shotType}.\`, \`Mistimes the \${shotType} completely!\`);
             }
        } else if (contact === 'edge') {
             prefixPool.push(\`Takes a thick edge!\`, \`Flashes hard and gets an edge!\`);
        }

        let prefix = '';
        if (prefixPool.length > 0 && this.maybe(0.95)) {
            prefix = this.pick(prefixPool) + ' ';
        }

        let pool = [`;

const correctedWicketLineStart = `    wicketLine(result, batter, bowler, context) {
        const dismissalType = this.getDismissalType(result);
        const dismissalText = result.dismissal || 'is out';
        const phase = this.getPhase(context);
        const narrative = this.inferMatchNarrative(context);
        const prefix = this.getPhysicsPrefix(result);

        let pool = [`;

content = content.replace(wicketLineStart, correctedWicketLineStart);

// Clean up the `\${prefix}` inside the strings of wicketLine using Regex
// We can just regex replace all \`\${prefix} with \` inside wicketLine
// A safer way is to just let the prefix be injected at the end: `return prefix + this.pick(pool);`
// So we must remove \${prefix} from the strings.
content = content.replace(/\\\$\\{prefix\\}/g, '');

// Now we update the return statements for sixLine, fourLine, dotLine, runLine, wicketLine.
// Since each ends with `return this.pick(pool);`, we can confidently replace it for those methods.

function prependPrefixToReturn(methodName) {
    // Find the method start
    const methodRegex = new RegExp('    ' + methodName + '\\\\(result, batter, bowler, context\\\\) \\\\{[\\\\s\\\\S]*?return this\\\\.pick\\\\(pool\\\\);\\n    \\\\}', 'g');
    
    content = content.replace(methodRegex, (match) => {
        // If it doesn't already have 'const prefix = this.getPhysicsPrefix(result);' at the top,
        // we add prefix to the return statement.
        
        let newMatch = match;
        // Check if prefix is defined inside the method
        if (!newMatch.includes('const prefix = this.getPhysicsPrefix(result);')) {
            newMatch = newMatch.replace('{', '{\\n        const prefix = this.getPhysicsPrefix(result);');
        }
        
        // Update the return statement
        newMatch = newMatch.replace('return this.pick(pool);', 'return prefix + this.pick(pool);');
        return newMatch;
    });
}

prependPrefixToReturn('wicketLine');
prependPrefixToReturn('sixLine');
prependPrefixToReturn('fourLine');
prependPrefixToReturn('dotLine');
prependPrefixToReturn('runLine');

fs.writeFileSync(path, content, 'utf-8');
console.log('Update successful!');
