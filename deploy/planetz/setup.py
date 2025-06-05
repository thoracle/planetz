from setuptools import setup, find_packages

setup(
    name="planetz-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "Flask>=3.0.2",
        "python-dotenv>=1.0.1",
        "pytest>=8.0.2",
        "gunicorn>=21.2.0",
    ],
    python_requires=">=3.8",
) 