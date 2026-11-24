from throughline.api.app import create_app
from throughline.settings import Settings

app = create_app(Settings.from_env())
