# Example DSL file for StreamSynth
source file("./logs/access.log")

# Filter for error status codes
filter(event.statusCode >= 400)

# Transform to a simpler format
transform({ 
  code: event.statusCode, 
  url: event.url, 
  timestamp: new Date(event.timestamp)
})

# Write to output file
sink file("./errors.json")

# Set buffer size to limit memory usage
bufferSize 1000