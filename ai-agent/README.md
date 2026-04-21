# SRE Agent

## [Autonomous Kubernetes Diagnostic & Operations Terminal]

This AGENT is designed to reduce the "context-switching" tax for DevOps engineers. Instead of manually chaining `kubectl` commands, the agent interprets high-level intent and executes the necessary API calls.

inputs = {"messages": [("user", "Is there any error in the pod logs for pod named starting from product-service (get the exact pod name from using the get_pods tool) in the 'default' namespace.")]}


### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vishnuprasad2004/ecommerce-microservices.git
    cd sre-ai-agent
    ```

2.  **Set up a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment:**
    Create a `.env` file in the root directory:
    ```env
    OPENROUTER_API_KEY=your_key_here
    ```

5.  **Run the Agent:**
    ```bash
    python src/app.py
    ```


## 4. Future Enhancements (Roadmap)
While the current version handles core diagnostics, the following features are in development:

* **Self-Healing Actions:** Ability to restart deployments or scale replicas via natural language (e.g., "Scale the product service to 3 nodes").
* **Multi-Namespace Support:** A 'context switcher' tool to jump between dev, staging, and production namespaces.
* **Historical Analysis:** Integration with Prometheus/Grafana to analyze trends over time, not just current state.

## Technologies Used:
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![LangChain](https://img.shields.io/badge/langchain-%231C3C3C.svg?style=for-the-badge&logo=langchain&logoColor=white)