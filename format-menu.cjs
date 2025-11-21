const fs = require('fs');

const items = JSON.parse(fs.readFileSync(0, 'utf-8'));
const available = items.filter(i => i.is_available);
const categories = {};

available.forEach(item => {
  if (!categories[item.category]) categories[item.category] = [];
  categories[item.category].push(item);
});

let output = 'MENU KNOWLEDGE BASE\n\n';
for (const [category, items] of Object.entries(categories).sort()) {
  output += category + ':\n';
  items.forEach(item => {
    output += '  - ' + item.name + ': $' + item.base_price;
    if (item.description) output += ' - ' + item.description.substring(0, 100);
    if (item.options && item.options.sizes && item.options.sizes.length > 0) {
      output += ' (Sizes: ' + item.options.sizes.map(s => s.name + ' $' + s.price).join(', ') + ')';
    }
    output += '\n';
  });
  output += '\n';
}
console.log(output);
