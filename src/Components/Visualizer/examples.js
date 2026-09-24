export const EXAMPLE_JSON = [
	{
		id: 1,
		customer: "Léa Martin",
		email: "lea@example.com",
		created: "2024-03-01",
		paid: true,
		total: 42.5,
		address: { street: "12 rue de la Paix", city: "Paris", zip: "75002" },
		items: [
			{ sku: "BK-001", title: "Clean Code", qty: 1, price: 32.5 },
			{ sku: "PN-004", title: "Pen", qty: 5, price: 2 },
		],
		tags: ["new", "newsletter"],
	},
	{
		id: 2,
		customer: "Omar Benali",
		email: "omar@example.com",
		created: "2024-03-02",
		paid: false,
		total: 18,
		address: { street: "3 place Bellecour", city: "Lyon", zip: null },
		items: [{ sku: "NB-010", title: "Notebook", qty: 3, price: 6 }],
		tags: [],
	},
];

export const EXAMPLE_SQL = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  avatar_url VARCHAR(255)
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INTEGER REFERENCES categories(id)
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  published BOOLEAN DEFAULT false
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  CONSTRAINT fk_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);
`;
