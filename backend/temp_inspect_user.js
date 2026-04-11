const User = require('./models/User');
const schema = User.schema;
console.log('email match', schema.path('email').options.match);
console.log('email type', schema.path('email').instance);
console.log('email validators', schema.path('email').validators);
