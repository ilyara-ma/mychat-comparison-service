# Example Files for File Path Endpoint

This directory contains example JSON files that can be used to test the `/api/v1/comparison/run-from-file` endpoint. Files must be accessible on the server's filesystem.

## Supported Formats

The endpoint accepts **JSON format only**. Files must be valid JSON.

## Example Files

### `teams.json`
Contains only team IDs:
```json
{
  "teamIds": ["team-123", "team-456", "team-789"]
}
```

### `channels.json`
Contains only channel IDs:
```json
{
  "channelIds": ["channel-abc", "channel-def", "channel-ghi"]
}
```

### `teams-and-channels.json`
Contains both team IDs and channel IDs:
```json
{
  "teamIds": ["team-123", "team-456"],
  "channelIds": ["channel-abc", "channel-def"]
}
```

### `teams-simple-array.json`
Simple array format (treated as teamIds):
```json
["team-123", "team-456", "team-789"]
```

## Usage Examples

### Using Swagger UI:
1. Navigate to `/api/v1/comparison/run-from-file` endpoint in Swagger UI
2. Click "Try it out"
3. In the `filePath` query parameter field, enter: `examples/teams.json` (or any other file path on the server)
4. Click "Execute" to run the comparison

**Note**: 
- File path is relative to the server's working directory or can be an absolute path
- Files must exist on the server's filesystem (not your local machine)
- When running locally, ensure files are in the project directory

### Using curl with file path:
```bash
curl -X POST "http://localhost:3000/api/v1/comparison/run-from-file?filePath=examples/teams.json"
```

### Using curl with absolute file path:
```bash
curl -X POST "http://localhost:3000/api/v1/comparison/run-from-file?filePath=/absolute/path/to/examples/teams.json"
```

### Using curl with array format file:
```bash
curl -X POST "http://localhost:3000/api/v1/comparison/run-from-file?filePath=examples/teams-simple-array.json"
```

### Using curl with both teams and channels:
```bash
curl -X POST "http://localhost:3000/api/v1/comparison/run-from-file?filePath=examples/teams-and-channels.json"
```

## JSON Format Requirements

- **Object format**: `{"teamIds": [...], "channelIds": [...]}`
  - Both `teamIds` and `channelIds` are optional
  - At least one must be provided
  - Arrays must contain only string values

- **Array format**: `["team1", "team2", ...]`
  - Treated as `teamIds`
  - Must contain only string values

## Notes

- Files must be valid JSON
- Non-string values in arrays are automatically filtered out
- Empty files will result in an error
- Files must contain at least one team ID or channel ID
