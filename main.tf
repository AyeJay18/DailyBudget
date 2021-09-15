provider "azurerm" {
    features {}
}

terraform {
  backend "azurerm" {
    resource_group_name = "TerraForm-Test"
    storage_account_name = "terraformstoreacct"
    container_name = "terraformcnt"
    key = "terraform.tfstate"
  }
  
}

variable "dbconnectstring" {
  type        = string
  description = "MongoDB Connect String"
}

variable "TOKEN_SECRET" {
  type        = string
  description = "JWT Token Secret"
}

resource "azurerm_resource_group" "dailybudget_rg" {
  name     = "DailyBudgetTest"
  location = "East US"
}

resource "azurerm_app_service_plan" "dailybudget_asp" {
  name                = "DailyBudgetTest"
  location            = azurerm_resource_group.dailybudget_rg.location
  resource_group_name = azurerm_resource_group.dailybudget_rg.name
  kind = "Linux"
  reserved = true

  sku {
    tier = "Free"
    size = "F1"
  }
}

resource "azurerm_app_service" "dailybudget_as" {
  name                = "DailyBudgetTest"
  location            = azurerm_resource_group.dailybudget_rg.location
  resource_group_name = azurerm_resource_group.dailybudget_rg.name
  app_service_plan_id = azurerm_app_service_plan.dailybudget_asp.id

  site_config {
    linux_fx_version = "NODE|14-lts"
  }

  app_settings = {
    "DB_CONNECT" = "${var.dbconnectstring}"
    "TOKEN_SECRET" = "${var.TOKEN_SECRET}"
  }
}