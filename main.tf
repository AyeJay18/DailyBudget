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

resource "azurerm_resource_group" "dailybudget_rg" {
  name     = "DailyBudgetTest"
  location = "East US"
}

resource "azurerm_app_service_plan" "dailybudget_asp" {
  name                = "DailyBudgetTest"
  location            = azurerm_resource_group.dailybudget_rg.location
  resource_group_name = azurerm_resource_group.dailybudget_rg.name

  sku {
    tier = "Free"
    size = "F1"
  }
}

resource "azurerm_app_service" "dailybudget_as" {
  name                = "DailyBudgetTest"
  location            = azurerm_resource_group.dailybudget_as.location
  resource_group_name = azurerm_resource_group.dailybudget_as.name
  app_service_plan_id = azurerm_app_service_plan.dailybudget_as.id

  site_config {
    dotnet_framework_version = "v4.0"
    scm_type                 = "LocalGit"
  }

  app_settings = {
    "DB_CONNECT" = "${var.dbconnectstring}"
  }
}