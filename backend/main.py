from fastapi import FastAPI

# Initialize the FastAPI app instance
app = FastAPI()

# Define a simple GET path operation
@app.get("/")
def read_root():
    return {"message": "Hello Welcome to the backend of the trips left application"}
