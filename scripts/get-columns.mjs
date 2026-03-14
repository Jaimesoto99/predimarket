const r = await fetch('https://mrdkhfbwesehffbystto.supabase.co/rest/v1/markets?limit=1&select=*', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZGtoZmJ3ZXNlaGZmYnlzdHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY2OTk1MywiZXhwIjoyMDg2MjQ1OTUzfQ.yPlUU55lXEx1EVfXdF58sNjlblsKsXL4iz2eawnewxg',
  }
})
const d = await r.json()
console.log('Columns:', Object.keys(d[0]).join(', '))
console.log('Full record:', JSON.stringify(d[0], null, 2))
