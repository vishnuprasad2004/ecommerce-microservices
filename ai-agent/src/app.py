import dotenv
import sys

from rich.console import Console
from rich.panel import Panel
from rich.live import Live
from rich.status import Status
from rich.markdown import Markdown
from rich.table import Table


from langchain_openrouter import ChatOpenRouter
from langchain.agents import create_agent
from langchain_core.tools import tool
from prompts import system_prompt, cli_tool_prompt
from tools.k8s_tools import K8sTools

dotenv.load_dotenv()
console = Console()

k8s_provider = K8sTools()
tools = k8s_provider.get_tools()


# 1. Use the dedicated OpenRouter class
model = ChatOpenRouter(
    model="nvidia/nemotron-3-nano-30b-a3b:free",
)

# 2. Use create_react_agent (replaces the older create_agent)
agent = create_agent(
    model=model,
    tools=tools,
    system_prompt=system_prompt + "\n\n" + cli_tool_prompt
)

def print_banner():
    console.clear()
    banner = """
    :'######::'########::'########:::::::::::::'###:::::'######:::'########:'##::: ##:'########:
    '##... ##: ##.... ##: ##.....:::::::::::::'## ##:::'##... ##:: ##.....:: ###:: ##:... ##..::
    ##:::..:: ##:::: ##: ##:::::::::::::::::'##:. ##:: ##:::..::: ##::::::: ####: ##:::: ##::::
    . ######:: ########:: ######:::'#######:'##:::. ##: ##::'####: ######::: ## ## ##:::: ##::::
    :..... ##: ##.. ##::: ##...::::........: #########: ##::: ##:: ##...:::: ##. ####:::: ##::::
    '##::: ##: ##::. ##:: ##:::::::::::::::: ##.... ##: ##::: ##:: ##::::::: ##:. ###:::: ##::::
    . ######:: ##:::. ##: ########:::::::::: ##:::: ##:. ######::: ########: ##::. ##:::: ##::::
    :......:::..:::::..::........:::::::::::..:::::..:::......::::........::..::::..:::::..::::
    """
    console.print(banner, style="bold yellow")
    console.print("[bold blue]SRE AI Agent v1.0[/bold blue] | [dim]Type 'quit' or 'exit' to close[/dim]\n")


if __name__ == "__main__":

    print_banner()

    while True:
        # Using Rich's prompt style
        user_query = console.input("[bold green]➜[/bold green] [bold white]What's your query?[/bold white] : ")

        if user_query.lower() in ["quit", "exit"]:
            console.print("[bold red]Exiting SRE Agent. Goodbye![/bold red]")
            sys.exit(0)

        inputs = {"messages": [("user", user_query)]}
        final_message = None

        # Use Status for the "Thinking" spinner
        with console.status("[bold blue]Analyzing cluster context...", spinner="dots") as status:
            for chunk in agent.stream(inputs, stream_mode="updates"):
                for node_name, data in chunk.items():
                    
                    if node_name == "tools":
                        for msg in data.get("messages", []):
                            # Create a nice panel for tool executions
                            console.print(Panel(
                                f"[dim]{msg.content[:200]}...[/dim]", 
                                title=f"[bold cyan]🔧 Tool Executed:[/bold cyan] {msg.name}",
                                border_style="blue",
                                expand=False
                            ))
                            # Update spinner text to show progress
                            status.update(f"[bold blue]Processing {msg.name} results...")
                    
                    if node_name == "model":
                        # Capture the last AI message
                        messages = data.get("messages", [])
                        if messages:
                            final_message = messages[-1]

        # Final Analysis Rendering
        if final_message:
            console.print("\n" + "━" * 50, style="dim")
            console.print("[bold yellow]ANALYSIS[/bold yellow]")
            
            # Use Markdown renderer to make the AI output look like a pro CLI tool
            # (Matches headings, lists, and tables automatically)
            md = Markdown(final_message.content)
            console.print(md)
            console.print("━" * 50 + "\n", style="dim")