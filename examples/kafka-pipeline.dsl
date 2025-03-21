# Kafka to Kafka pipeline
source kafka({"brokers": ["localhost:9092"], "topic": "input-topic", "groupId": "streamsynth-dsl"})

# Filter for high-value messages
filter(event.value > 100)

# Transform the events
transform({
  originalValue: event.value,
  doubled: event.value * 2,
  timestamp: new Date().toISOString()
})

# Send to output topic
sink kafka({"brokers": ["localhost:9092"], "topic": "output-topic"})

# Set buffer size to limit memory usage
bufferSize 1000