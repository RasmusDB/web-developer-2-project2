const API_KEY = process.env.MY_API_KEY;

if (API_KEY) {
  console.log("API key loaded securely from GitHub Actions.");

  // Optional proof that it works: item row 1 is "Gil"
  fetch(`${API_KEY}/sheet/Item/1?fields=Name`)
    .then(res => res.json())
    .then(data => console.log("Test item:", data.fields.Name));
} else {
  console.error("ERROR: API key not found in environment variables.");
  process.exit(1);   // makes the workflow fail visibly
}